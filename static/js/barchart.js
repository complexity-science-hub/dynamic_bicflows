function createBarchart(dimension, name){
  var rotateXLabelThreshold = 3;

  var barChartContainer = d3.select("#filtercharts").append("div");
  barChartContainer.classed("with-border", true);

  let barChartHead = barChartContainer.append("div").text(name);
  barChartHead.classed("barchart-header", true);

  let barChartBody = barChartContainer.append("div");
  barChartBody.classed("barchart", true);

  barChartHead.on("click", function(d) {
    let collapsed =! barChartBody.classed("barchart-collapsed");

    barChartBody.classed("barchart-collapsed", collapsed);
    barChartHead.classed("barchart-header-collapsed", collapsed);
  });

  var margin = {top: 20, right: 20, bottom: 25, left: 50};

  if (isRotateXLabels()) {
    margin.bottom = 50;
  }

  var width = barChartBody.node().offsetWidth - margin.left - margin.right,
      height = barChartBody.node().offsetHeight - margin.top - margin.bottom;

  barChartBody.classed("barchart-collapsed", true);
  barChartHead.classed("barchart-header-collapsed", true);

  var svg = barChartBody.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

  var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
      y = d3.scaleLinear().rangeRound([height, 0]);

  var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var xAxis = d3.axisBottom(x).tickFormat(function(d) {return d; });
  var yAxis = d3.axisLeft(y).tickArguments([5]).tickFormat(function(d) { return (d.toFixed(2)/1000000); });
  function formatYear(d){ k=""+d; yr = k.substr(0,k.length-1); qt = k.charAt(k.length-1); return yr+" Q"+qt; };

  var selections = d3.map();

  g.append("g")
      .attr("class", "bar");

  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")");

  g.append("g")
      .attr("class", "axis axis--y")
    .append("text")
      .attr("dx", "-0.5em")
      .attr("dy", "-0.5em")
      .attr("text-anchor", "middle")
      .style("fill", "#000")
      .text("Mio €");

  function chart() {
    update();
    reset();
    hasSelections();
    getSelections();
  }

  chart.update = update;
  chart.reset = reset;
  chart.hasSelections = hasSelections;
  chart.getSelections = getSelections;

  function reset() {
    selections.clear();
  }

  function hasSelections() {
    return selections.values().some(d=>d);
  }

  function getSelections() {
    if(!hasSelections()) return selections.keys();
    selArray = [];
    selections.each(function(v,k){ if(v) selArray.push(k) });
    return selArray;
  }

  function update(){
    data = dimension.group().reduceSum(function(d) { return getValue(d); }).top(Infinity).sort(function(a,b){ return a.key - b.key });

    if(selections.empty())
      data.forEach(function(d){ selections.set(d.key, false) });

    // Update axes
    x.domain(data.map(function(d){ return d.key })); //k=""+d.key; yr = k.substr(0,k.length-1); qt = k.charAt(k.length-1); return yr+" Q"+qt;
    y.domain([0, d3.max(data, function(d){ return d.value; })]);

    g.select(".axis.axis--x")
      .call(xAxis)
      .attr("transform", "translate(0," + height + ")")
    .selectAll("text")
      .style("text-anchor", "middle")
      .style("fill", function(d) { return (selections.get(d)) ? "brown" : "black"; })
      .on("click", function(d) {
        selections.set(d, !selections.get(d));

        if(document.getElementById("annular") != null)
          wasFiltered = true;

        if(!selections.values().every(f => f==false)) {
          data_filtered = dimension.filterFunction(function (f) {
            return selections.get(f) && f;
          }).top(Infinity);
          barChartHead.classed("filter-active", true);
        }else {
          data_filtered = dimension.filterAll().top(Infinity);
          barChartHead.classed("filter-active", false);
        }

        filterData(data_filtered);
      })
      .on('mouseover', function(d){
        if(!selections.get(d))
          d3.select(this).style("fill", "brown")
      })
      .on('mouseout', function(d){
        if(!selections.get(d))
          d3.select(this).style("fill", "black")
      });

    if (isRotateXLabels()) {
      g.select(".axis.axis--x").selectAll("text")
      .attr("dx", "-.8em")              // do
      .attr("dy", ".15em")              // this
      .attr("transform", "rotate(-45)") // depending on length of label
      .style("text-anchor", "end")
    }

    g.select(".axis.axis--y")
      .call(yAxis);

    // Update existing bars
    var bars = g.select(".bar").selectAll(".bar")
      .data(data)
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.key); })
        .attr("y", function(d) { return y(d.value.toFixed(2)); })
        .attr("width", x.bandwidth())
        .attr("height", function(d) { return height - y(d.value.toFixed(2)); })
        .style("fill", function(d) { return (selections.get(d.key)) ? "brown" : "steelblue"; });

    // Append new bars
    bars.enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.key); })
      .attr("y", function(d) { return y(d.value.toFixed(2)); })
      .attr("width", x.bandwidth())
      .attr("height", function(d) { return height - y(d.value.toFixed(2)); })
      .style("fill", function(d) { return (selections.get(d.key)) ? "brown" : "steelblue"; })
      .on("click", function(d) {
        selections.set(d.key, !selections.get(d.key));

        if(document.getElementById("annular") != null)
          wasFiltered = true;

        if(!selections.values().every(f => f==false)) {
          data_filtered = dimension.filterFunction(function (f) {
            return selections.get(f) && f;
          }).top(Infinity);
          barChartHead.classed("filter-active", true);
        } else {
          data_filtered = dimension.filterAll().top(Infinity);
          barChartHead.classed("filter-active", false);
        }

        filterData(data_filtered);
      })
      .on('mousemove', function(d){
        updateToolTip(d3.event, formatYear(d.key), format(d.value));
        if(!selections.get(d.key))
          d3.select(this).style("fill", "brown")
      })
      .on('mouseout', function(d){
        $("#tooltip").hide();
        if(!selections.get(d.key))
          d3.select(this).style("fill", "steelblue")
      })

      // Remove omitted bars
      bars.exit().remove();
    }

    function isRotateXLabels() {
      data = dimension.group().reduceSum(function (d) {
        return getValue(d);
      }).top(Infinity);

      maxKeyLength = 0;

      data.forEach(function(record) {
        maxKeyLength = Math.max(maxKeyLength, record.key.toString().length);
      });

      return maxKeyLength > rotateXLabelThreshold;
    }

    return chart;
}
