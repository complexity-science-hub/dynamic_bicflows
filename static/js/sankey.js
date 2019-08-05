function sankey(data){

  $("#info").hide();
  // $("#back").hide();
  $("#backToSankey").hide();

  var width = document.getElementById("mainview").offsetWidth;
  var height = document.getElementById("mainview").offsetHeight-10;

  setMaxLabelLength(width/6.5); // max label length

  var cbWidth = Math.round(width/150);
  var openClusters = ["Home"];//d3.set();
  var selected = false;
  var selectedHistogram = false;
  // var selectedHistogramKey = false;
  var mouseoverMainBar = false;
  d3.select("#mainview").select("svg").remove();
  var svg = d3.select("#mainview").append("svg").attr("width", width).attr("height", height).attr("id", "sankey");
  var g = svg.append("g").attr("transform","translate("+(width/3)+",40)");
  // console.log(data)
// data_ = data.slice()
  var bp=viz.bP()
      .dataComplete(data)
  		// .data(data.data)
      // .histogramData(data.clusters)
  		.min(12)
  		.pad(5) //10
  		.height(height-40)
  		.width(width/3)
  		.barSize(function(d){
        return 35;
      })
      .duration(500)
      .edgeOpacity(.5)
      .fill(function(d){
        // return (d.key == "Sonstige") ? "#afc017" : (d.part == "primary") ? "#e6550d" : "#1c9099";
        return (d.key == "Sonstige") ? "#afc017" : (d.part == "primary") ? "#8f7ab8" : "#46b477";
      })
      .fillEdges(function(d){
        // return "#9c6744";
        return "#b8a37a";
      })
      .fillHistogram(function(d){
        return (d.elements.length == 1) ? "lightgrey" : "dimgray";
      });

  g.call(bp);

  function update(subClusters, cRemoved){
    // wird evtl gebraucht, aber verlangsamt extrem bei subclustering
    // backToSankey();

    // console.log(openClusters);

    // updateProgress();

    enters = bp.update2(subClusters)

    g.selectAll(".histogramBars").select("rect")
      .on("mousemove", mouseoverHistogram)
      .on("mouseout", mouseoutHistogramLabel)
      .on("mouseover", function(d){ if(d.elements.length == 1) mouseoverHistogramLabel(d) })
      .on("click",function(d){ if(d.elements.length == 1){ selectedHistogram = selectedHistogram ? false : d; mouseoverHistogramLabel(d); updateTableSelection(); }})
      .on("dblclick", function(d){ if(d.elements.length == 1) invokeTableSelection(d) });

    g.selectAll(".histogramBars").select(".label").transition().duration(500)
    	.attr("x",d=>(d.part=="primary"? d.dx-30: d.dx+d.width+30))
      .attr("y", function(d){
        if(d.yLabel != null) return d.yLabel;
      })
    	.text(function(d){
          if(d.label != null) return d.label.trunc();
      })
      .style("fill", labelHistogramColor)
    	.attr("text-anchor",d=>(d.part=="primary"? "end": "start"));

    enters.hb.append("text").attr("class","label")
    	.attr("x",d=>(d.part=="primary"? d.dx-30: d.dx+d.width+30))
      .attr("y", function(d){
        if(d.yLabel != null) return d.yLabel;
      })
    	.text(function(d){
          if(d.label != null) return d.label.trunc();
      })
      .style("fill", labelHistogramColor)
    	.attr("text-anchor",d=>(d.part=="primary"? "end": "start"))
      .on("click",function(d){ selectedHistogram = selectedHistogram ? false : d; mouseoverHistogramLabel(d); updateTableSelection(); })
      .on("dblclick", invokeTableSelection)
      .on("mouseover", mouseoverHistogramLabel)
      .on("mouseout", mouseoutHistogramLabel);

    g.selectAll(".mainBars")
    	.on("mouseover",mouseover)
    	.on("mouseout",mouseout)
      .on("mousemove",mousemove)
      .on("dblclick",click)
      .on("click",function(d){ selected = selected ? false : d; mouseover(d)})

    if(selectedHistogram){
      g.selectAll(".selectionBars").remove();
      g.selectAll(".selectionEdges").remove();
      // mouseoverHistogramLabel(selectedHistogram);

      selectedHistogram = false;
      $('#tableOrganisations tbody tr').removeClass('selected');
      $('#tableMedia tbody tr').removeClass('selected');
    }

    addContextBar(cRemoved);

    // if(selectedHistogram){
    //   var tmp = selectedHistogram;
    //   selectedHistogram = false;
    //   mouseoverHistogramLabel(tmp);
    //   selectedHistogram = tmp;
    // }
  }

  g.selectAll(".mainBars")
  	.on("mouseover",mouseover)
  	.on("mouseout",mouseout)
    .on("mousemove",mousemove)
    .on("dblclick",click)
    .on("click",function(d){ selected = selected ? false : d; mouseover(d)})

  g.selectAll(".histogramBars").select("rect")
    .on("mousemove", mouseoverHistogram)
    // .on("mouseout", mouseoutHistogram)
    .on("mouseout", mouseoutHistogramLabel)
    .on("mouseover", function(d){ if(d.elements.length == 1) mouseoverHistogramLabel(d) })
    .on("click",function(d){ if(d.elements.length == 1){ selectedHistogram = selectedHistogram ? false : d; mouseoverHistogramLabel(d); updateTableSelection(); }})
    .on("dblclick", function(d){ if(d.elements.length == 1) invokeTableSelection(d) });

  g.selectAll(".histogramBars").append("text").attr("class","label")
  	.attr("x",d=>(d.part=="primary"? d.dx-30: d.dx+d.width+30))
  	// .attr("y",d=>d.dy+d.height/2+4)
    .attr("y", function(d){
      if(d.yLabel != null) return d.yLabel;
    })
  	.text(function(d){
        if(d.label != null) return d.label.trunc();
    })
    .style("fill", labelHistogramColor)
  	.attr("text-anchor",d=>(d.part=="primary"? "end": "start"))
    .on("click",function(d){ selectedHistogram = selectedHistogram ? false : d; mouseoverHistogramLabel(d); updateTableSelection(); })
    .on("dblclick", invokeTableSelection)
    .on("mouseover", mouseoverHistogramLabel)
    .on("mouseout", mouseoutHistogramLabel);

  //add home context bars
  addContextBar();

  // g.append("g").attr("class","mainContextBars").attr("id","cbHome").selectAll(".contextBars")
  // .data(bp.currentBars().mainBars)
  //   .enter()
  //   .append("g")
  //   .attr("transform", function(d){
  //     tx = (d.part == "primary") ? (d.x-width/3) : (d.x+width/3);
  //     return "translate("+tx+","+d.y+")";
  //   })
  //   .attr("class","contextBars")
  //   .append("rect")
  //   .attr("x",-cbWidth).attr("y",d=>-d.height).attr("width",cbWidth).attr("height",d=>2*d.height)
  //   .style("fill", function(d){ return bp.fill()(d) })
  //   .on("mousemove",d=>updateToolTip(d3.event, format(d.value),""))
  //   .on("mouseout",d=>$("#tooltip").hide())

  function addContextBar(cRemoved){
    var cID = openClusters[openClusters.length-1];
    var dx = (cbWidth + cbWidth)*(openClusters.length-1);

    if(cRemoved){
      g.select("#cb"+cID.replace(/\./g,'')).selectAll(".contextBars").selectAll("rect")
        .style("fill-opacity", 1)

      g.select("#cb"+cID.replace(/\./g,'')).selectAll(".cbrect").remove();

      return;
    }

    // Add new contextBars
    g.append("g").attr("class","mainContextBars").attr("id","cb"+cID.replace(/\./g,'')).selectAll(".contextBars")
    .data(bp.currentBars().mainBars)
      .enter()
      .append("g")
      .attr("transform", function(d){
        tx = (d.part == "primary") ? (d.x-width/3)+dx : (d.x+width/3)-dx;
        return "translate("+tx+","+d.y+")";
      })
      .attr("class","contextBars")
      .append("rect")
      .attr("x",-cbWidth).attr("y",d=>-d.height).attr("width",cbWidth).attr("height",d=>2*d.height)
      .style("fill", function(d){ return bp.fill()(d) })
      .on("mousemove",d=>updateToolTip(d3.event, format(d.value),""))
      .on("mouseout",d=>$("#tooltip").hide())

    // Add grouping rect
    if(openClusters.length > 1){
      var oldcID = openClusters[openClusters.length-2];
      var dx2 = (cbWidth + cbWidth)*(openClusters.length-2);
      var rects = [{x: bp.currentBars().mainBars.x - width/3 + dx2,
                y: bp.currentBars().mainBars.y,
                height: bp.currentBars().mainBars.height,
                r: -45},
               {x: bp.currentBars().mainBars.x2 + width/3 - dx2,
                y: bp.currentBars().mainBars.y,
                height: bp.currentBars().mainBars.height,
                r: 45}
              ];

      g.select("#cb"+oldcID.replace(/\./g,'')).selectAll(".mainContextBars")
        .data(rects)
        .enter()
        .append("rect")
          .attr("class","cbrect")
          .attr("transform", function(d){ return "translate("+d.x+","+d.y+")"; })
          .attr('x', -cbWidth)
          .attr('y', 0)
          .attr('width', cbWidth)
          .attr('height', d=>d.height)
          .style("fill-opacity", 0)
          .on("click", function(e){
            spinner.spin(document.getElementById("mainview"));
            d3.json("removeSubClusters/"+cID, function(f){
              while(openClusters[openClusters.length-1] != oldcID){ g.select("#cb"+openClusters.pop().replace(/\./g,'')).remove(); }
              update(f, true);
              spinner.stop();
            })
          })

      //change opacities
      g.select("#cb"+oldcID.replace(/\./g,'')).selectAll(".contextBars").selectAll("rect")
        .style("fill-opacity", function(d){ return (d.key == cID) ? 1 : 0.1 })
    }

    // add sums
    var dx2 = (cbWidth + cbWidth)*(openClusters.length-1);
    var rects = [{x: bp.currentBars().mainBars.x - width/3 + dx2,
              y: bp.currentBars().mainBars.y,
              r: -45,
              part: "primary"},
             {x: bp.currentBars().mainBars.x2 + width/3 - dx2,
              y: bp.currentBars().mainBars.y,
              r: 45}
            ];
    g.select("#cb"+cID.replace(/\./g,'')).selectAll(".mainContextBars")
      .data(rects)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("transform", function(d){ return "translate("+(d.x-cbWidth/2)+","+d.y+"), rotate("+d.r+")"; })
      .attr("dy", "-.3em")
      .style("text-anchor", function(d,i){ return (i==0) ? "start" : "end" })
      .text(format2(bp.currentBars().mainBars.sum))
      .style("fill",d=>bp.fill()(d));
  }

  function mouseoutHistogram(d){
    // mouseoutHistogramLabel(d);
    $("#tooltip").hide();
  }

  function mouseoverHistogram(d){
    if(d.elements.length == 1){
      // mouseoverHistogramLabel(d);
      updateToolTip(d3.event, d.elements[0].key, format(d.elements[0].value));
    }
    else{
      totalsum = d3.sum(d.elements, f=>f.value)
      updateToolTip(d3.event, d.elements.length+ " " + groupedEntitiesName, format(totalsum))
    }
  }

  function mouseoverHistogramLabel(d){
    // console.log(d)
    // console.log("selectedHistogram",selectedHistogram,"!mouseoverMainBar", !mouseoverMainBar, "selected",selected);

    // if(!selectedHistogram) selectedHistogramKey = d.elements[0].key
    //
    // updateTableSelection();

    if((selectedHistogram && !mouseoverMainBar) || (selectedHistogram && selected)) return;

    var orgs;
    var sum;
    if(d.part == "primary"){
      firstGroupDim.filter(d.elements[0].key);

      var mList = {};
      bp.histogramData().entries().forEach(function(e){
        if(d.key != "Sonstige" || (d.key == "Sonstige" && e.key != "Sonstige")){
          var m = e.value.columns;
          mList = $.extend(mList, m);
        }
      })
      mList = d3.map(mList);

      secondGroupDim.filterFunction(function(e){ return mList.has(e); });
      orgs = d3.nest()
        .key(function(e) { return getSecond(e); })
        .rollup(function(e) { return d3.sum(e, function(f){ if(getValue(f) >= 1) return getValue(f);}); })
        .entries(secondGroupDim.top(Infinity))

      bp.showOverlay(d, orgs, d.part);
      sum = d3.sum(orgs, function(e){ return e.value });
      orgs = d3.set(orgs, function(e){ return e.key });
      firstGroupDim.filterAll();
      secondGroupDim.filterAll();
    }
    else{
      secondGroupDim.filter(d.elements[0].key);

      var mList = {};
      bp.histogramData().entries().forEach(function(e){
        if(d.key != "Sonstige" || (d.key == "Sonstige" && e.key != "Sonstige")){
          var m = e.value.rows;
          mList = $.extend(mList, m);
        }
      })
      mList = d3.map(mList);

      firstGroupDim.filterFunction(function(e){ return mList.has(e); });
      orgs = d3.nest()
        .key(function(e) { return getFirst(e); })
        .rollup(function(e) { return d3.sum(e, function(f){ if(getValue(f) >= 1) return getValue(f);}); })
        .entries(firstGroupDim.top(Infinity))

      bp.showOverlay(d, orgs, d.part);
      sum = d3.sum(orgs, function(e){ return e.value });
      orgs = d3.set(orgs, function(e){ return e.key });
      secondGroupDim.filterAll();
      firstGroupDim.filterAll();
    }

    var sel = d.elements[0].key;
    var mbs = d3.set();

    g.selectAll(".histogramBars").select("text")
      .style("fill", function(f){
        if(d.part != f.part)
          return f.elements.some(function(g){ return orgs.has(g.key) }) ? "crimson" : "lightgrey";
        else
          return (f.elements.some(function(g){ return g.key == sel})) ? "crimson" : "lightgrey";//labelHistogramColor(f)
      })

    g.selectAll(".histogramBars").select("rect")
      .style("fill", function(f){
        if(d.part != f.part){
          if(f.elements.some(function(g){ return orgs.has(g.key) })){
            mbs.add(f.key);
            return bp.fillHistogram()(f);
          }
          else
            return "#f2f2f2";
        }
        else
          return (f.elements.some(function(g){ return g.key == sel})) ? bp.fillHistogram()(f) : "#f2f2f2";
      })
      .style("stroke", function(f){
        if(d.part != f.part)
          return f.elements.some(function(g){ return orgs.has(g.key) }) ? "black" : "#f2f2f2";
        else
          return (f.elements.some(function(g){ return g.key == sel})) ? "black" : "#f2f2f2";
      })
      .style("stroke-width", function(f){
        if(d.part != f.part)
          return f.elements.some(function(g){ return orgs.has(g.key) }) ? 0.3 : 0;
        else
          return (f.elements.some(function(g){ return g.key == sel})) ? 0.3 : 0;
      })

    g.selectAll(".subBars").select("rect")
      .style("fill", function(f){
        if(d.part != f.part)
          return (d.part=="primary" && mbs.has(f.secondary)) ? bp.fill()(f) : (d.part=="secondary" && mbs.has(f.primary)) ? bp.fill()(f) : "#f2f2f2";
        else
          return (d.key==f.key) ? bp.fill()(d) : "#f2f2f2";
      })

    g.selectAll(".edges")
      .style("fill-opacity", 0.025)
      .style("pointer-events", "none");

    if((!mouseoverMainBar || selected) && d3.event != null) updateToolTip(d3.event, d.elements[0].key, format(d.elements[0].value)); //format(sum)
  }

  function mouseoutHistogramLabel(d){
    $("#tooltip").hide();
    if(selectedHistogram) return;

    g.selectAll(".edges")
      .style("fill-opacity", function(d){
        if(selected){
          var sKey = selected.key;
          if(selected.part == "primary")
            return (d.primary == sKey) ? bp.edgeOpacity() : 0;
          else
            return (d.secondary == sKey) ? bp.edgeOpacity() : 0;
        }
        else
          return bp.edgeOpacity();
      })
      .style("pointer-events", "auto");

    g.selectAll(".histogramBars").select("rect")
      .style("fill", function(d){ return bp.fillHistogram()(d); })
      .style("stroke", "black")
      .style("stroke-width", 0.3);

    g.selectAll(".subBars").select("rect")
      .style("fill", labelHistogramColor);

    g.selectAll(".histogramBars").select("text")
      .style("fill", labelHistogramColor);

    g.selectAll(".histogramBars").selectAll(".label")
      .style("fill-opacity", 1);

    g.selectAll(".selectionBars").remove();

    g.selectAll(".selectionEdges").remove();
  }

  function mousemove(d){
    if(selected && (d.part != selected.part)){
      var title = (d.part=="primary") ? "Cluster "+d.key+" \u2192 Cluster "+selected.key : "Cluster "+selected.key+" \u2192 Cluster "+d.key;
      // updateToolTip(d3.event, title+" ("+d3.format(".2%")(d.percent)+")", format(d.value)+" / "+format(d.value/d.percent));
      updateToolTip(d3.event, format(d.value)+" / "+format(d.value/d.percent), d3.format(".2%")(d.percent));
    }
    else
      updateToolTip(d3.event, format(d.value), "");
      // updateToolTip(d3.event, "Cluster "+d.key, format(d.value));
  }

  function mouseover(d){
    if(selected || selectedHistogram) return;

  	hb_enter = bp.mouseover(d);

    overout(d);

    if(selectedHistogram){
      mouseoverMainBar = true;
      g.selectAll(".selectionBars").remove();
      g.selectAll(".selectionEdges").remove();
      mouseoverHistogramLabel(selectedHistogram);
    }
  }

  function mouseout(d){
    $("#tooltip").hide();

    if(selected || selectedHistogram) return;

  	hb_enter = bp.mouseout(d);

    overout(d);

    if(selectedHistogram){
      g.selectAll(".selectionBars").remove();
      g.selectAll(".selectionEdges").remove();
      mouseoverHistogramLabel(selectedHistogram);
    }
    mouseoverMainBar = false;
  }

  function overout(d){
    g.selectAll(".histogramBars").select(".label").transition().duration(500)
    	.attr("x",d=>(d.part=="primary"? d.dx-30: d.dx+d.width+30))
      .attr("y", function(d){
        if(d.yLabel != null) return d.yLabel;
      })
    	.text(function(d){
          if(d.label != null) return d.label.trunc();
      })
      .style("fill", labelHistogramColor)
    	.attr("text-anchor",d=>(d.part=="primary"? "end": "start"));

    hb_enter.append("text").attr("class","label")
    	.attr("x",d=>(d.part=="primary"? d.dx-30: d.dx+d.width+30))
      .attr("y", function(d){
        if(d.yLabel != null) return d.yLabel;
      })
    	.text(function(d){
          if(d.label != null) return d.label.trunc();
      })
      .style("fill", labelHistogramColor)
    	.attr("text-anchor",d=>(d.part=="primary"? "end": "start"))
      .on("click",function(d){ selectedHistogram = selectedHistogram ? false : d; mouseoverHistogramLabel(d); updateTableSelection(); })
      .on("dblclick", invokeTableSelection)
      .on("mouseover", mouseoverHistogramLabel)
      .on("mouseout", mouseoutHistogramLabel);

    g.selectAll(".histogramBars").select("rect")
      .on("mousemove", mouseoverHistogram)
      .on("mouseout", mouseoutHistogramLabel)
      .on("mouseover", function(d){ if(d.elements.length == 1) mouseoverHistogramLabel(d) })
      .on("click",function(d){ if(d.elements.length == 1){ selectedHistogram = selectedHistogram ? false : d; mouseoverHistogramLabel(d); updateTableSelection(); }})
      .on("dblclick", function(d){ if(d.elements.length == 1) invokeTableSelection(d) });
  }

  function click(d){
    if(d.key == "Sonstige") return;

    selected = false;
    openClusters.push(d.key);
    spinner.spin(document.getElementById("mainview"));
    d3.json("getSubClusters/"+d.key, function(f){
      // console.log(f)
      spinner.stop();
      // openClusters.each(function(g){ f.data.push([g+"#Cluster", g+"#Cluster", 0]); });
      update(f);
      // histogram(f);
    })
    // $("#back").show();
    // updateProgress();
  }

  function updateProgress(){
    p = d3.select("#progress")
    p.selectAll("text").remove();

    if(openClusters.length == 1) return;

    openClusters.forEach(function(cID,i){
      if(i!=0) p.append("text").text(" \u2192 ")
      if(i == openClusters.length-1) { p.append("text").text(cID); return; }

      p.append("text").attr("class","clickable")
        .text(cID)
        .on("click", function(e){
          spinner.spin(document.getElementById("mainview"));
          d3.json("removeSubClusters/"+openClusters[i+1], function(f){
            while(openClusters[openClusters.length-1] != cID){ openClusters.pop(); }
            update(f);

            spinner.stop();
          })
        })
    })
  }

  function invokeTableSelection(d){
    if(d.part == "primary"){
      secondGroupDim.filterAll();
      firstGroupDim.filter(d.elements[0].key);
      var data = secondGroupDim.group().reduceSum(function(d){ return getValue(d); }).top(Infinity);
      data = data.filter(function(d){ return d.value >= 1; });
      updateAll();

      var row = firstGroupTable.row("#"+d.elements[0].key.replace(/[()., ]/g,"")).data();
      var info = {name: row[0], sum: format(row[1]), type: firstGroupIndex};
      annularchart = annular(data, info);

      firstGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
      setTimeout(function(){ firstGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
    }
    else{
      firstGroupDim.filterAll();
      secondGroupDim.filter(d.elements[0].key);
      var data = firstGroupDim.group().reduceSum(function(d){ return getValue(d); }).top(Infinity);
      data = data.filter(function(d){ return d.value >= 1; });
      updateAll();

      var row = secondGroupTable.row("#"+d.elements[0].key.replace(/[()., ]/g,"")).data();
      var info = {name: row[0], sum: format(row[1]), type: secondGroupIndex};
      annularchart = annular(data, info);

      secondGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
      setTimeout(function(){ secondGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
    }
  }

  function updateTableSelection(){
    $('#tableOrganisations tbody tr').removeClass('selected');
    $('#tableMedia tbody tr').removeClass('selected');
    if(selectedHistogram){
      var k = selectedHistogram.elements[0].key;
      if(selectedHistogram.part == "primary"){
        firstGroupTable.row("#"+k.replace(/[()., ]/g,"")).scrollTo();
        setTimeout(function(){ $(firstGroupTable.row("#"+k.replace(/[()., ]/g,"")).node()).toggleClass('selected'); }, delay);
        // $(firstGroupTable.row("#"+selectedHistogramKey.replace(/[()., ]/g,"")).node()).toggleClass('selected');

        // $("#tableOrganisations").find("tbody tr:eq("+firstGroupTable.rows("#"+selectedHistogramKey)[0][0]+")").toggleClass('selected');
      }
      else{
        secondGroupTable.row("#"+k.replace(/[()., ]/g,"")).scrollTo();
        setTimeout(function(){ $(secondGroupTable.row("#"+k.replace(/[()., ]/g,"")).node()).toggleClass('selected'); }, delay);
        // $(secondGroupTable.row("#"+selectedHistogramKey.replace(/[()., ]/g,"")).node()).toggleClass('selected');

        // $("#tableMedia").find("tbody tr:eq("+secondGroupTable.rows("#"+selectedHistogramKey)[0][0]+")").toggleClass('selected');
      }
    }
  }

  function label(d){
    return (d.key.indexOf("#")!=-1) ? ">>>CLUSTER "+d.key.split('#')[0]+"<<<" : d.key+" : "+format(d.value)
  }

  function labelColor(d){
    return (d.key.indexOf("#")!=-1) ? "navy" : "darkred";
  }

  function labelWeight(d){
    return "bold";// (d.key.indexOf("#")!=-1) ? "bold" : "normal";
  }

  function labelHistogramColor(d){
    return bp.fill()(d);
  }

  function selectedHistogramF(_){
    if(!arguments.length) return selectedHistogram;
    selectedHistogram = _;
    // selectedHistogramKey = key;
  }

  function openClustersF(_){
    if(!arguments.length) return openClusters;
    openClusters = _;
    g.selectAll(".mainContextBars").remove();
  }

  // d3.select(self.frameElement).style("height", "800px");
  function chart() {
    update();
    mouseoverHistogramLabel();
    mouseoutHistogramLabel();
    selectedHistogramF();
    openClustersF()
  }
  chart.update = update;
  chart.mouseoverHistogramLabel = mouseoverHistogramLabel;
  chart.mouseoutHistogramLabel = mouseoutHistogramLabel;
  chart.selectedHistogramF = selectedHistogramF;
  chart.openClustersF = openClustersF;
  chart.bp = bp;
  chart.openClusters = openClusters;


  return chart;
}
