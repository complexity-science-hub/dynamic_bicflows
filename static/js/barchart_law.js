function createBarchart_law(data){
  var margin = {top: 20, right: 20, bottom: 25, left: 50},
      width = document.getElementById("filterchart").offsetWidth - margin.left - margin.right,
      height = document.getElementById("filterchart").offsetHeight - margin.top - margin.bottom;

  var svg = d3.select("#filterchart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

  var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
      y = d3.scaleLinear().rangeRound([height, 0]);

  var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var xAxis = d3.axisBottom(x).tickFormat(function(d) {return "§"+d; });
  var yAxis = d3.axisLeft(y).tickArguments([5]).tickFormat(function(d) { return (d.toFixed(2)/1000000); });

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
      .attr("text-anchor", "end")
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
    selArray = [];
    selections.each(function(v,k){ if(v) selArray.push(k) });
    return selArray;
  }

  function update(){
    data = bekanntgabeDim.group().reduceSum(function(d) { return d.EURO; }).top(Infinity).sort(function(a,b){ return a.key - b.key });

    if(selections.empty()){
      data.forEach(function(d){ selections.set(d.key, (d.key==2 || d.key ==4)) });
    }

    // Update axes
    x.domain(data.map(function(d){ return d.key })); //k=""+d.key; yr = k.substr(0,k.length-1); qt = k.charAt(k.length-1); return yr+" Q"+qt;
    y.domain([0, d3.max(data, function(d){ return d.value; })]);

    g.select(".axis.axis--x")
      .call(xAxis)
      .attr("transform", "translate(0," + height + ")")
    .selectAll("text")
      .style("text-anchor", "middle")
      .style("fill", function(d) { return (selections.get(d)) ? "brown" : "black"; })
      // .attr("dx", "-.8em")
      // .attr("dy", ".15em")
      // .attr("transform", "rotate(-45)")
      .on("click", function(d) {
        selections.set(d, !selections.get(d));

        if(document.getElementById("annular") != null)
          wasFiltered = true;

        if(!selections.values().every(f => f==false))
          data_filtered = bekanntgabeDim.filterFunction(function(f) { return selections.get(f) && f; }).top(Infinity);
        else
          data_filtered = bekanntgabeDim.filterAll().top(Infinity);

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

        // if(!selections.values().every(f => f==false))
          data_filtered = bekanntgabeDim.filterFunction(function(f) { return selections.get(f) && f; }).top(Infinity);
        // else
        //   data_filtered = bekanntgabeDim.filterAll().top(Infinity);

        filterData(data_filtered);
      })
      .on('mousemove', function(d){
        updateToolTip(d3.event, "§"+d.key, format(d.value));
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
    return chart;
}
