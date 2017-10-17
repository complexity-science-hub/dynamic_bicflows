function annular(data, info){

  // $("#cb_scroll_label").hide();
  $("#info").show();
  $("#back").hide();
  $("#progress").hide();
  $("#backToSankey").show();

  var dpt=0;
  var margin = 150;
  var width = document.getElementById("mainview").offsetWidth;
  var height = document.getElementById("mainview").offsetHeight-25;
  var radius = Math.min(width, height) / 2 - margin-50;

  // d3.select("#mainview").select("svg").remove();
  document.getElementById("sankey").style.display = "none";
  if(document.getElementById("annular") != null)
    document.getElementById("annular").remove();

  var x = d3.scaleLinear()
    .range([0, 2 * Math.PI]);

  var y = d3.scaleSqrt()
      .range([0, radius-10]);

  var partition = d3.partition();
  data = prepareDataNew2(data);
  data = {"name": "root", "children": data};
  // var cutoff = 35;
  // data = prepareData(data, cutoff);

  root = d3.hierarchy(data);
  root.sum(function(d) { return d.size; });

  var color = d3.scaleLinear().domain([0, data.children.length]).range([0, 1]);
  // var colorOthers = d3.scaleLinear().domain([0, cutoff]).range([0, 1]); //others.length
  var colorOthers = d3.scaleLinear().domain([0, root.height]).interpolate(d3.interpolateHcl).range(["white", "black"]);

  var arc = d3.arc()
      .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
      .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
      .innerRadius(function(d) { return (d.depth != 1) ? (radius - 90 - d.depth*20) : (radius - 70); })
      .outerRadius(function(d) { return (d.depth != 1) ? (radius - 70 - d.depth*20) : (radius - 10); });

  var svg = d3.select("#mainview").append("svg")
      .attr("id","annular")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  svg.selectAll("path")
        .data(partition(root).descendants())
        .enter()
        .append("g").attr("class", "node")
        .attr("display", function(d) { return d.depth <= 1 ? null : "none"; }); // ANPASSEN

  path = svg.selectAll(".node")
      .append("path")
      .attr("d", arc)
      .style("fill", function(d,i) { if(d.parent != null) color.domain([0, d.parent.children.length]); return (d.depth!=0) ? (d.data.name != "Others") ? d3.interpolateRainbow(color(i)) : colorOthers(d.depth) : "#f2f2f2"; })
      .style("stroke", "white")
      .on("click", function(d){ d.hasOwnProperty("children") ? click(d) : null; })
      .on("dblclick", function(d){ !d.hasOwnProperty("children") ? invokeTableSelection(d) : null; })
      .on('mousemove', function(d){ d3.select(this).style("opacity", 0.5); if(d.data.name != "root") { updateToolTip(d3.event, d.data.name, format(d.value)); } })
      .on('mouseout', function(d){ d3.select(this).style("opacity", 1); $("#tooltip").hide(); })

  text = svg.selectAll(".node")
       .append("text")
          .attr("text-anchor", function(d) { return x((d.x0 + d.x1)/2) > Math.PI ? "end" : null; })
          .attr("transform", computeTextRotation)
          .text(function(d) {
              return d.data.name === "root" ? "" : adjustLabel(d);
          })
          .on("click", function(d){ d.hasOwnProperty("children") ? click(d) : null; })
          .on("dblclick", function(d){ !d.hasOwnProperty("children") ? invokeTableSelection(d) : null; })
          .on('mousemove', function(d){ d3.select(this).style("opacity", 0.5); if(d.data.name != "root") { updateToolTip(d3.event, d.data.name, format(d.value)); } })
          .on('mouseout', function(d){ d3.select(this).style("opacity", 1); $("#tooltip").hide(); })

  var orgText = svg.append("text")
    .attr("text-anchor", "middle")
    .attr("y", -height/2+11)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text(info.type+": "+info.name+" | "+info.sum);

    function click(d) {
      //Hide text while Sunburst transitions
      text.transition().attr("display", "none");

      arc.innerRadius(function(f) { return (f.depth != d.depth+1) ? (radius - 90)-(d.depth-f.depth)*20 : (radius - 70); })
        .outerRadius(function(f) { return (f.depth != d.depth+1) ? (radius - 70)-(d.depth-f.depth)*20 : (radius - 10); });

      svg.selectAll(".node").attr("display", function(e) {
          return (e.depth > d.depth+1) ? "none" : null;
      });
      svg.transition()
          .duration(750)
          .tween("scale", function(f) {
            var xd = d3.interpolate(x.domain(), [d.x0, d.x1]),
                yd = d3.interpolate(y.domain(), [d.y0, 1]),
                yr = d3.interpolate(y.range(), [d.y0 ? 20 : 0, radius-10]);
            return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
          })
        .selectAll("path")
          .attrTween("d", function(d) { return function() { return arc(d); }; })
          .on("end", function(e, i) {
                // check if the animated element's data e lies within the visible angle span given in d
                if (e.x0 >= d.x0 && e.x0 < d.x1) {
                    // get a selection of the associated text element
                    var arcText = d3.select(this.parentNode).select("text");
                    // fade in the text element and recalculate positions
                    arcText.transition().duration(750)
                        .attr("display", null)
                        .attr("class", "visible")
                        .attr("text-anchor", function(d) { return x((d.x0 + d.x1)/2) > Math.PI ? "end" : null; })
                        .attr("transform", computeTextRotation)
                        .text(function(f) {
                          if(f.depth != d.depth)
                            return f.data.name === "root" ? "" : adjustLabel(f);
                        });
                }
          });
  }

  function computeTextRotation(d) {
    if(d.y0 == 0.5 && d.y1 == 1 && d.x0 == 0 && d.x1 == 1) //if only one element
      return "rotate(" + -25 + ")" + "translate(" + radius + ")"
    else
      return "rotate(" + (x((d.x0 + d.x1)/2) * 180 / Math.PI - 90) + ")"
          + "translate(" + radius + ")"
          + (x((d.x0 + d.x1)/2) > Math.PI ? "rotate(180)" : "");
  }

  function adjustLabel(d){

    label = d.data.name;
    dist = computeDistanceToBorder(d);
    labelWidth = getWidthOfText(label);

    if(dist < labelWidth){
      mx = (dist*label.length)/labelWidth - 5;
      return label.slice(0,mx)+"...";
    }
    return label;

    function computeDistanceToBorder(d) {
      phi = x((d.x0 + d.x1)/2) - Math.PI/2;

      c = Math.cos(phi)
      s = Math.sin(phi)
      var a,b;
      if (width * Math.abs(s) < height * Math.abs(c)){
         a = Math.sign(c) * width / 2
         b = Math.tan(phi) * a
      }
      else{
         b = Math.sign(s) * height / 2
         a = (1/Math.tan(phi)) * b
      }

      dist = Math.sqrt(a*a + b*b) - radius-10;

      return dist
    }

    function getWidthOfText(txt){
      if(getWidthOfText.c === undefined){
          getWidthOfText.c=document.createElement('canvas');
          getWidthOfText.ctx=getWidthOfText.c.getContext('2d');
      }
      getWidthOfText.ctx.font = "10px sans-serif";
      return getWidthOfText.ctx.measureText(txt).width;
    }
  }

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

  function prepareDataNew(data_){
      // console.log(data_);
    var newData = [];
    var others = [];
    var total = d3.sum(data_, function(d){ return d.value });
    data_.forEach(function(d,i){
      // if(d.value/total > 0.004)
      if((2*radius*Math.PI*d.value)/total > 8)
        newData.push({"name": d.key, "size": d.value})
      else
        others.push(d);
    });

    if(others.length > 0)
      newData.push({"name": "Others", "children": prepareDataNew(others)});

    return newData;
  }

  function prepareDataNew2(data_){
    dpt++;
      // console.log(data_);
    var newData = [];
    var others = [];
    var total = d3.sum(data_, function(d){ return d.value });
    data_.forEach(function(d,i){
      // if(d.value/total > 0.004)
      if((2*radius*Math.PI*d.value)/total > 8)
        newData.push({"name": d.key, "size": d.value})
      else
        others.push(d);
    });

    if(others.length > 0){
      if(dpt<9 && newData.length>10)
        newData.push({"name": "Others", "children": prepareDataNew2(others)});
      else{
        o_data = others.map(function(e){
          return {"name": e.key, "size": e.value}
        });
        newData.push({"name": "Others", "children": o_data});
        // console.log(o_data);
      }
    }

    return newData;
  }

  function prepareData(data, limit){
    newData = [];
    others = [];

    //// alternative variation starting from the back of the data array
    // data.reverse();
    // data.forEach(function(d,i){
    //   if(others.length<limit)
    //     others.push({"name": d.key, "size": d.value})
    //   else {
    //     newData.push({"name": "Others", "children": others.reverse()});
    //     others = [];
    //   }
    // });
    // newData = others.reverse().concat(newData.reverse());

    data.forEach(function(d,i){
      if(i<limit)
        newData.push({"name": d.key, "size": d.value})
      else {
        others.push({"name": d.key, "size": d.value})
      }

      if(others.length >= limit){
        newData.push({"name": "Others", "children": others});
        others = [];
      }
    });
    if(others.length > 0)
      newData.push({"name": "Others", "children": others});

    return {"name": "root", "children": newData};
  }

  function invokeTableSelection(d){
    if(info.type == "Medium"){
      mediumDim.filterAll();
      rechtstraegerDim.filter(d.data.name);
      var data = mediumDim.group().reduceSum(function(d){ return d.EURO; }).top(Infinity);
      data = data.filter(function(d){ return d.value >= 1; });
      updateAll();

      var row = rechtstraegerTable.row("#"+d.data.name.replace(/[()., ]/g,"")).data();
      var newInfo = {name: row[0], sum: format(row[1]), type: "Rechtsträger"};
      annularchart = annular(data, newInfo);

      rechtstraegerTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
      setTimeout(function(){ rechtstraegerTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
    }
    else{
      rechtstraegerDim.filterAll();
      mediumDim.filter(d.data.name);
      var data = rechtstraegerDim.group().reduceSum(function(d){ return d.EURO; }).top(Infinity);
      data = data.filter(function(d){ return d.value >= 1; });
      updateAll();

      var row = mediumTable.row("#"+d.data.name.replace(/[()., ]/g,"")).data();
      var newInfo = {name: row[0], sum: format(row[1]), type: "Medium"};
      annularchart = annular(data, newInfo);

      mediumTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
      setTimeout(function(){ mediumTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
    }
  }

  function getInfo(){
    return info;
  }

  function chart() {
    getInfo()
  }
  chart.getInfo = getInfo;

  return chart;
}
