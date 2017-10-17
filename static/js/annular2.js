function annular(data){

  var margin = 150;
  var width = document.getElementById("mainview").offsetWidth;
  var height = document.getElementById("mainview").offsetHeight;
  var radius = Math.min(width, height) / 2 - margin;

  d3.select("#mainview").select("svg").remove();

  data = reduceDataAmount(data, 30);

  var normalize = d3.scaleLinear().domain([0, data.length]).range([0, 1]);

  var arc = d3.arc()
      .outerRadius(radius - 10)
      .innerRadius(radius - 70);

  var pie = d3.pie()
      .sort(null)
      .value(function(d) { return d.value; });

  var svg = d3.select("#mainview").append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var g = svg.selectAll(".arc")
      .data(pie(data))
    .enter().append("g")
      .attr("class", "arc");

  var orgText = svg.append("text")
    .attr("text-anchor", "middle")
    .attr("y", "-12")
    .style("fill", "#000")
    .style("font-size", "20px")
  var sumText = svg.append("text")
    .attr("text-anchor", "middle")
    .attr("y", "12")
    .style("fill", "#000")
    .style("font-size", "20px")

  g.append("path")
      .attr("d", arc)
      .style("fill", function(d,i) { return d3.interpolateRainbow(normalize(i)); })
      .on('mouseover', function(d){ d3.select(this).style("opacity", 0.5); orgText.text(d.data.key); sumText.text(format(d.data.value)); })
      .on('mouseout', function(d){ d3.select(this).style("opacity", 1); orgText.text(""); sumText.text(""); })

  g.append("text")
      .attr("text-anchor", function(d) { return ((d.startAngle + d.endAngle)/2) > Math.PI ? "end" : null; })
      .attr("transform", function(d) {
          return "rotate(" + (((d.startAngle + d.endAngle)/2) * 180 / Math.PI - 90) + ")"
              + "translate(" + radius + ")"
              + (((d.startAngle + d.endAngle)/2) > Math.PI ? "rotate(180)" : "");
      })
      .attr("dy", ".35em")
      .text(function(d) { return d.data.key; })
      .on('mouseover', function(d){ d3.select(this).style("opacity", 0.5); orgText.text(d.data.key); sumText.text(format(d.data.value)); })
      .on('mouseout', function(d){ d3.select(this).style("opacity", 1); orgText.text(""); sumText.text(""); })

  function reduceDataAmount(data, limit){
    newData = [];
    others = [];
    sum = 0;
    if(data.length > limit){
      data.forEach(function(d,i){
        if(i<limit)
          newData.push(d)
        else {
          others.push(d)
          sum += d.value;
        }
      });
      newData.push({key: "Others", value: sum});

      return newData;
    }
    return data;
  }
}
