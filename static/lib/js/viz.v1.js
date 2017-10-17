!function(){
  var viz = { version: "1.1.8" };

  viz.bP = function(){
    var key_scale, value_scale
    ,keyPrimary, keySecondary, value
    ,width, height, orient, barSize, min, pad
    ,data, fill, g, edgeOpacity, duration
    ,sortPrimary, sortSecondary, edgeMode
    ,histogramData, dataComplete
    ,sumPerHistogramBar = 10000000
    ,currentBars, colorScale = d3.map()
    ,mainGradient, fillEdges, fillHistogram
    ;
    function bP(_){
      // mainGradient = d3.select('#sankey').append('defs').append('linearGradient')
      //     .attr('id', 'mainGradient');
      //
      // mainGradient.append('stop')
      //     .attr('stop-color', d3.rgb("#e6550d"))
      //     .attr('offset', '0');
      //
      // mainGradient.append('stop')
      //     .attr('stop-color', d3.rgb("#1c9099"))
      //     .attr('offset', '1');
      g=_;
      _.each(function() {
        var g = d3.select(this);
        var bars = bP.bars();
        // bP.addGradient();

        var s = g.selectAll(".subBars")
        .data(bars.subBars)
        .enter()
        .append("g")
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .attr("class","subBars")
        .append("rect")
        .attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh);

        if(typeof fill !=="undefined") s.style("fill", function(d){ return bP.fillSubBars(d); });

        var e = g.selectAll(".edges")
        .data(bars.edges)
        .enter()
        .append("path")
        .attr("class","edges")
        .attr("d",function(d){ return d.path; })
        .style("fill-opacity",bP.edgeOpacity());

        if(typeof fillEdges !=="undefined") e.style("fill", fillEdges);//"url(#mainGradient)");//

        g.selectAll(".histogramBars")
        .data(bars.histogramBars, function(d){return d.id;})
        .enter()
        .append("g")
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .attr("class","histogramBars")
        .append("rect")
        .attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)
        // .style("fill-opacity",0.3)
        .style("fill",fillHistogram)

        g.selectAll(".mainBars")
        .data(bars.mainBars)
        .enter()
        .append("g")
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .attr("class","mainBars")
        .append("rect")
        .attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh)
        .style("fill-opacity",0)
        // .on("mouseover",bP.mouseover)
        // .on("mouseout",bP.mouseout);
      });
    }
    // p/s ändern -> for loops anpassen damits auch für "others" geht -> key
    bP.addGradient = function(){
      d3.select('#sankey').select('defs').remove();
      var svgDefs = d3.select('#sankey').append('defs');
      for(p=0;p<currentBars.cnt;p++){
        cp = d3.hsl(240,1,0.5); //"#e6550d"
        pKey = currentBars.mainBars[p].key;
        cp.l = colorScale.get(pKey);

        for(s=0;s<currentBars.cnt;s++){
          cs = d3.hsl(130,1,0.5); //"#1c9099"
          sKey = currentBars.mainBars[currentBars.cnt+s].key;
          cs.l = colorScale.get(sKey);

          mainGradient = svgDefs.append('linearGradient')
              .attr('id', 'mainGradient'+pKey+'|'+sKey);

          mainGradient.append('stop')
              .attr('stop-color', cp)
              .attr('offset', '0');

          mainGradient.append('stop')
              .attr('stop-color', cs)
              .attr('offset', '1');
        }
      }
    }
    // bP.fillEdges = function(d){
    //   // return "url(#mainGradient"+d.primary+"|"+d.secondary+")";
    //   return d3.rgb(156, 103, 68); //"#817353"
    // }
    bP.fillEdges = function(_){
      if(!arguments.length) return fillEdges;
      fillEdges = _;
      return bP;
    }
    bP.fillHistogram = function(_){
      if(!arguments.length) return fillHistogram;
      fillHistogram = _;
      return bP;
    }
    bP.currentBars = function(_){
      if(!arguments.length) return currentBars;

      oldCnt = (typeof currentBars !== "undefined") ? currentBars.cnt : -1;
      currentBars = _;
      newCnt = currentBars.mainBars.length/2;
      currentBars.cnt = newCnt;

      currentBars.mainBars.x = d3.min(currentBars.mainBars, function(d){ return d.x})
      currentBars.mainBars.x2 = d3.max(currentBars.mainBars, function(d){ return d.x})
      currentBars.mainBars.y = d3.min(currentBars.mainBars, function(d){ return d.y-d.height})
      currentBars.mainBars.height = d3.max(currentBars.mainBars, function(d){ return d.y+d.height})-currentBars.mainBars.y;
      currentBars.mainBars.sum = d3.sum(currentBars.mainBars, function(d){ return d.value })/2;

      // if(oldCnt != newCnt){
      //   currentBars.cnt = newCnt;
      //   brightness = d3.range(0.9,0.1,-0.7/(newCnt-1));
      //
      //   colorScale.clear();
      //   for(i=0;i<newCnt;i++){
      //     colorScale.set(currentBars.mainBars[i].key, brightness[i]);
      //   }
      //
      //   bP.addGradient();
      // }

      return bP;
    }
    bP.data = function(_){
      if(!arguments.length) return data;
      data = _;
      return bP;
    }
    bP.histogramData = function(_){
      if(!arguments.length) return histogramData;
      histogramData = d3.map(_);
      return bP;
    }
    bP.dataComplete = function(_){
      if(!arguments.length) return {data: data, clusters: histogramData};
      dataComplete = _;
      bP.data(_.data);
      bP.histogramData(_.clusters);
      return bP;
    }
    bP.fillSubBars = function(d){
      c = fill(d);
      // c.l = colorScale.get(d.key);
      return c;
    }
    bP.fill = function(_){
      if(!arguments.length) return fill;
      fill = _;
      return bP;
    }
    bP.keyPrimary = function(_){
      if(!arguments.length) return typeof keyPrimary !== "undefined" ? keyPrimary : function(d){ return d[0]; } ;
      keyPrimary = _;
      return bP;
    }
    bP.sortPrimary = function(_){
      if(!arguments.length) return typeof sortPrimary !== "undefined" ? sortPrimary : d3.ascending ;
      sortPrimary = _;
      return bP;
    }
    bP.keySecondary = function(_){
      if(!arguments.length) return typeof keySecondary !== "undefined" ? keySecondary : function(d){ return d[1]; };
      keySecondary = _;
      return bP;
    }
    bP.sortSecondary = function(_){
      if(!arguments.length) return typeof sortSecondary !== "undefined" ? sortSecondary : d3.ascending;
      sortSecondary = _;
      return bP;
    }
    bP.value = function(_){
      if(!arguments.length) return typeof value !== "undefined" ? value : function(d){ return d[2]; };
      value = _;
      return bP;
    }
    bP.width = function(_){
      if(!arguments.length) return typeof width !== "undefined" ? width : 400;
      width = _;
      return bP;
    }
    bP.height = function(_){
      if(!arguments.length) return typeof height !== "undefined" ? height : 600;
      height = _;
      return bP;
    }
    bP.barSize = function(_){
      if(!arguments.length) return barSize;
      barSize = _;
      return bP;
    }
    bP.min = function(_){
      if(!arguments.length) return typeof min !== "undefined" ? min : 0;
      min = _;
      return bP;
    }
    bP.orient = function(_){
      if(!arguments.length) return typeof orient !== "undefined" ? orient : "vertical";
      orient = _;
      return bP;
    }
    bP.pad = function(_){
      if(!arguments.length) return typeof pad !== "undefined" ? pad : 0;
      pad = _;
      return bP;
    }
    bP.duration = function(_){
      if(!arguments.length) return typeof duration !== "undefined" ? duration : 500;
      duration = _;
      return bP;
    }
    bP.edgeOpacity = function(_){
      if(!arguments.length) return typeof edgeOpacity !== "undefined" ? edgeOpacity : .4;
      edgeOpacity = _;
      return bP;
    }
    bP.edgeMode = function(_){
      if(!arguments.length) return typeof edgeMode !== "undefined" ? edgeMode : "curved";
      edgeMode = _;
      return bP;
    }
    bP.bars = function(mb){
      var mainBars={primary:[], secondary:[]};
      var subBars= {primary:[], secondary:[]};
      var histogramBars={primary:[], secondary:[]};
      var key ={primary:bP.keyPrimary(), secondary:bP.keySecondary() };
      var _or = bP.orient();

      calculateMainBars("primary");
      calculateMainBars("secondary");
      calculateSubBars("primary");
      calculateSubBars("secondary");
      floorMainBars(); // ensure that main bars is atleast of size mi.n
      // calculateHistograms("primary");

      returnObj = {
        mainBars:mainBars.primary.concat(mainBars.secondary)
        ,subBars:subBars.primary.concat(subBars.secondary)
        ,edges:calculateEdges()
        ,histogramBars:histogramBars.primary.concat(histogramBars.secondary)
      };
      returnObj.cnt = returnObj.mainBars.filter(function(d){ return d.key.indexOf(".")==-1; }).length/2;
      bP.currentBars(returnObj);

      return returnObj;

      function isSelKey(d, part){
        return (typeof mb === "undefined" || mb.part === part) || (key[mb.part](d) === mb.key);
      }
      function floorMainBars(){
        var m =bP.min()/2;

        mainBars.primary.forEach(function(d){
          if(d.height<m) d.height=m;
        });
        mainBars.secondary.forEach(function(d){
          if(d.height<m) d.height=m;
        });
      }
      function calculateHistograms(part, mb){
        // console.log(mb)
        // console.log(bP.histogramData())
        if(bP.histogramData().has(mb.key)) {
          c = bP.histogramData().get(mb.key)
          elements = part=="primary" ? d3.map(c.rows) : d3.map(c.columns);
          x = d3.scaleLinear().domain([1, 1000]).range([barSize({key: ""}), bP.width()]); //domain anpassen, range->barSize...width
          y = d3.scaleLinear().domain([0, d3.sum(elements.values())]).range([0, 2*mb.height]);

          sortedElements = elements.entries().sort(function(a,b){ return b.value - a.value; });
          // console.log("sortedElements",sortedElements);
          bins2 = [];
          x0 = 0;
          x1 = d3.sum(elements.values());
          others = [];
          for(i=0;i<sortedElements.length;i++){
            if( y(sortedElements[i].value) >= 2){
              xx = [];
              x0 = x1 - sortedElements[i].value;
              xx.push(sortedElements[i]);
              xx["x0"] = x0;
              xx["x1"] = x1;
              bins2.push(xx);
              x1 = x0;
            }
            else{
              others.push(sortedElements[i]);
            }
          }
          others["x0"] = 0;
          others["x1"] = x1;
          bins2.push(others);
          // bins2 = bins2.reverse();

          // console.log("bins2",mb,mb.key,mb.part,mb.value,bins2);

          var mbHeight = 2*mb.height;
          // var lineSpace = 10;
          // var fontsize = parseFloat($("label").css("font-size")) + lineSpace;
          var maxLabels = Math.round(mbHeight/(fontsize));
          var nbrLabels = 0;
          // var otherLabels = 0;
          // var label = "";

          bins2.forEach(function(bin){
            if(bin.length > 0){
              // console.log("mb.key",mb.key,"bin",bin)

              // if(nbrLabels < maxLabels){
              //   if(bin.length == 1)
              //     label = bin[0].key;
              //   else{
              //     label = "";
              //     // label += bin[otherLabels].key;
              //     while((nbrLabels+otherLabels) < maxLabels && otherLabels< bin.length){
              //       label += bin[otherLabels].key + "<br>";
              //       otherLabels++;
              //     }
              //   }
              // }
              // else
              //   label = null;
              histogramBars[part].push({
                x:mb.x
                ,y:mb.y
                ,dx:part=="primary" ? -mb.width-x(1) : mb.width //-mb.width-x(bin.length) : mb.width
                ,dy:mb.height-y(bin.x1)//-mb.height+y(bin.x0)//mb.height-y(bin.x1)// - y(bin.x0)) //-mb.height+y(bin.x0)
                ,height:Math.abs(y(bin.x1) - y(bin.x0))
                // ,totalHeight:2*mb.height
                ,width:x(1) //x(bin.length)
                ,part:part
                ,key:mb.key
                ,id:mb.key+part+bin[0].key
                ,yLabel: (nbrLabels < maxLabels) ? -mb.height+lineSpace+fontsize*nbrLabels : (nbrLabels == 0) ? (-mb.height+fontsize-lineSpace)/2 : null
                ,"label": (mb.height != 0 && (nbrLabels < maxLabels || nbrLabels == 0)) ? (bin.length==1) ? bin[0].key : "["+bin[0].key+", ...]" : null //label
                // ,value:d.value
                ,'elements':bin
              });
              nbrLabels++;
            }
          });
        }
      }
      function calculateMainBars(part){
        ;
        function v(d){ return isSelKey(d, part) ? bP.value()(d): 0;};

        var ps = d3.nest()
        .key(part=="primary"? bP.keyPrimary():bP.keySecondary())
        // .sortKeys(part=="primary"? bP.sortPrimary():bP.sortSecondary())
        .rollup(function(d){ return d3.sum(d,v); })
        .entries(bP.data())
        ;
        // sort descending
        if(mb == undefined){
          if(part == "primary"){
            ps.sort(function(a,b){
              if((a.key.startsWith("Sonstige")) != (b.key.startsWith("Sonstige")))
                return a.key.startsWith("Sonstige") ? 1 : -1;
              return b.value-a.value
            });
          }
          else {
            var pArray = mainBars.primary.map(function(d){return d.key;});
            if(pArray[pArray.length-1] != "Sonstige") pArray.push("Sonstige");
            ps.sort(function(a,b){
              return pArray.indexOf(a.key) - pArray.indexOf(b.key);
            });
          }
        }
        else{
          var pArray = bP.currentBars().mainBars.map(function(d,i){if(i<bP.currentBars().mainBars.length/2) return d.key;});
          if(pArray[pArray.length-1] != "Sonstige") pArray.push("Sonstige");
          ps.sort(function(a,b){
            return pArray.indexOf(a.key) - pArray.indexOf(b.key);
          });
        }

        var bars = bpmap(ps, bP.pad(), bP.min(), 0, _or=="vertical" ? bP.height() : bP.width());
        // var bsize = bP.barSize();
        ps.forEach(function(d,i){
          bsize = barSize(d);
          mainBars[part].push({
            x:_or=="horizontal"? (bars[i].s+bars[i].e)/2 : (part=="primary" ? bsize/2 : bP.width()-bsize/2)
            ,y:_or=="vertical"? (bars[i].s+bars[i].e)/2 : (part=="primary" ? bsize/2 : bP.height()-bsize/2)
            ,height:_or=="vertical"? (bars[i].e - bars[i].s)/2 : bsize/2
            ,width: _or=="horizontal"? (bars[i].e - bars[i].s)/2 : bsize/2
            ,part:part
            ,key:d.key
            ,value:d.value
            ,percent:bars[i].p
          });
          calculateHistograms(part, mainBars[part][mainBars[part].length-1]) //last added mb object
        });
      }
      function calculateSubBars(part){
        function v(d){ return isSelKey(d, part) ? bP.value()(d): 0;};

        var sort = part=="primary"
        ? function(a,b){ return bP.sortPrimary()(a.key, b.key);}
        : function(a,b){ return bP.sortSecondary()(a.key, b.key);}

        var map = d3.map(mainBars[part], function(d){ return d.key});

        var ps = d3.nest()
        .key(part=="primary"? bP.keyPrimary():bP.keySecondary())
        // .sortKeys(part=="primary"? bP.sortPrimary():bP.sortSecondary())
        .key(part=="secondary"? bP.keyPrimary():bP.keySecondary())
        // .sortKeys(part=="secondary"? bP.sortPrimary():bP.sortSecondary())
        .rollup(function(d){ return d3.sum(d,v); })
        .entries(bP.data());

        var pArray = mainBars.primary.map(function(d){return d.key;});
        if(pArray[pArray.length-1] != "Sonstige") pArray.push("Sonstige");
        ps.sort(function(a,b){
          return pArray.indexOf(a.key) - pArray.indexOf(b.key);
        });
        ps.forEach(function(f){
          f.values.sort(function(a,b){
            return pArray.indexOf(a.key) - pArray.indexOf(b.key);
          });
        })

        ps.forEach(function(d){
          var g= map.get(d.key);
          var bars = bpmap(d.values, 0, 0
            ,_or=="vertical" ? g.y-g.height : g.x-g.width
            ,_or=="vertical" ? g.y+g.height : g.x+g.width);

            // var bsize = bP.barSize();
            d.values.forEach(function(t,i){
              bsize = barSize(d);
              subBars[part].push({
                x:_or=="vertical"? part=="primary" ? bsize/2 : bP.width()-bsize/2 : (bars[i].s+bars[i].e)/2
                ,y:_or=="horizontal"? part=="primary" ? bsize/2 : bP.height()-bsize/2 : (bars[i].s+bars[i].e)/2
                ,height:(_or=="vertical"? bars[i].e - bars[i].s : bsize)/2
                ,width: (_or=="horizontal"? bars[i].e - bars[i].s : bsize)/2
                ,part:part
                ,primary:part=="primary"? d.key : t.key
                ,secondary:part=="primary"? t.key : d.key
                ,value:t.value
                ,percent:bars[i].p*g.percent
                ,index: part=="primary"? d.key+"|"+t.key : t.key+"|"+d.key //index
                ,key:d.key
              });
            });
          });
        }
        function calculateEdges(){
          var map=d3.map(subBars.secondary,function(d){ return d.index;});
          var eMode= bP.edgeMode();

          return subBars.primary.map(function(d){
            var g=map.get(d.index);
            return {
              path:_or === "vertical"
              ? edgeVert(d.x+d.width,d.y+d.height,g.x-g.width,g.y+g.height,g.x-g.width,g.y-g.height,d.x+d.width,d.y-d.height)
              : edgeHoriz(d.x-d.width,d.y+d.height,g.x-g.width,g.y-g.height,g.x+g.width,g.y-g.height,d.x+d.width,d.y+d.height)
              ,primary:d.primary
              ,secondary:d.secondary
              ,value:d.value
              ,percent:d.percent
              ,pKey:d.primary.charAt(0)
              ,sKey:d.secondary.charAt(0)
              ,id:d.primary+"|"+d.secondary
            }
          });
          function edgeVert(x1,y1,x2,y2,x3,y3,x4,y4){
            if(eMode=="straight") return ["M",x1,",",y1,"L",x2,",",y2,"L",x3,",",y3,"L",x4,",",y4,"z"].join("")
            var mx1=(x1+x2)/2,mx3=(x3+x4)/2;
            return ["M",x1,",",y1,"C",mx1,",",y1," ",mx1,",",y2,",",x2,",",y2,"L"
            ,x3,",",y3,"C",mx3,",",y3," ",mx3,",",y4,",",x4,",",y4,"z"].join("");
          }
          function edgeHoriz(x1,y1,x2,y2,x3,y3,x4,y4){
            if(eMode=="straight") return ["M",x1,",",y1,"L",x2,",",y2,"L",x3,",",y3,"L",x4,",",y4,"z"].join("")
            var my1=(y1+y2)/2,my3=(y3+y4)/2;
            return ["M",x1,",",y1,"C",x1,",",my1," ",x2,",",my1,",",x2,",",y2,"L"
            ,x3,",",y3,"C",x3,",",my3," ",x4,",",my3,",",x4,",",y4,"z"].join("");
          }
        }
        function bpmap(a/*array*/, p/*pad*/, m/*min*/, s/*start*/, e/*end*/){
          var r = m/(e-s-2*a.length*p); // cut-off for ratios
          var ln =0, lp=0, t=d3.sum(a,function(d){ return d.value;}); // left over count and percent.
          a.forEach(function(d){ if(d.value < r*t ){ ln+=1; lp+=d.value; }})
          var o= t < 1e-5 ? 0:(e-s-2*a.length*p-ln*m)/(t-lp); // scaling factor for percent.
          var b=s, ret=[];
          a.forEach(function(d){
            var v =d.value*o;
            ret.push({
              s:b+p+(v<m?.5*(m-v): 0)
              ,e:b+p+(v<m? .5*(m+v):v)
              ,p:t < 1e-5? 0:d.value/t
            });
            b+=2*p+(v<m? m:v);
          });

          return ret;
        }
      }
      bP.showOverlay = function(selection, _data, part, ext){
        // barsTODO
        // console.log("selection",selection,"_data",_data,"part",part)
        var selectionBars = [];
        var selectionEdges = [];
        var orgs = d3.map();
        _data.forEach(function(d){ orgs.set(d.key, d.value); });
        var hb = bP.currentBars().histogramBars.filter(function(d){ return d.part!=part; });
        // console.log(bP.currentBars())
        // console.log(orgs)

        hb.forEach(function(bar){
          elements = bar.elements;
            if(elements.some(function(d){ return orgs.has(d.key) })){
              selectionBars.push({
                x:bar.x
                ,y:bar.y
                ,dx:bar.dx
                ,dy:bar.dy
                ,height:(elements.length == 1) ?
                        (bar.height*orgs.get(elements[0].key))/elements[0].value :
                        (bar.height*d3.sum(elements, function(e){ if(orgs.has(e.key)) return orgs.get(e.key); }))/d3.sum(elements, function(e){ return e.value; })
                ,width:bar.width
                ,sum:(elements.length == 1) ? orgs.get(elements[0].key) : d3.sum(elements, function(e){ if(orgs.has(e.key)) return orgs.get(e.key); })
                ,key:bar.key
                ,other: (elements.length == 1) ? elements[0].key : d3.sum(elements, function(e){ if(orgs.has(e.key)) return 1; })+" Organisations"
                // ,barHeight:bar.height
              });
              // bar.subtotal = selectionBars[selectionBars.length-1];
            }
        });

        var pArray = [];
        bP.currentBars().mainBars.map(function(d,i){ if(i<bP.currentBars().cnt) pArray.push(d.key);});
        if(pArray[pArray.length-1] != "Sonstige") pArray.push("Sonstige");
        selectionBars.sort(
          firstBy(function(a, b) { return pArray.indexOf(a.key) - pArray.indexOf(b.key); })
          .thenBy("dy")
        );

        var e = bP.currentBars().histogramBars.filter(function(d){ return d.part==part && d.elements[0].key==selection.elements[0].key; })[0]; //get selected bar from current bars
        // if selected item is in grouped histogram bar
        if(ext){
          var v = 0;
          var sum = d3.sum(e.elements, function(f){
            if(f.key==ext)
              v = f.value;
            return f.value;
          })
          e.height = (e.height*v)/sum;
        }
        var yh1 = 0;
        var yh2 = 0;
        selectionBars.forEach(function(d){
          yh2 += (e.height*d.sum)/e.elements[0].value;
          selectionEdges.push({
            // path:edgeVert(d.x+d.dx,d.y+d.dy, e.x+e.dx+e.width,e.y+e.dy, e.x+e.dx+e.width,e.y+e.dy+e.height, d.x+d.dx,d.y+d.dy+d.height)
            path: (part=="primary") ?
                  edgeVert(d.x+d.dx,d.y+d.dy, e.x+e.dx+e.width,e.y+e.dy+yh1, e.x+e.dx+e.width,e.y+e.dy+yh2, d.x+d.dx,d.y+d.dy+d.height) :
                  edgeVert(d.x+d.dx+d.width,d.y+d.dy, e.x+e.dx,e.y+e.dy+yh1, e.x+e.dx,e.y+e.dy+yh2, d.x+d.dx+d.width,d.y+d.dy+d.height)
            ,sum: d.sum
            ,totalSum: e.elements[0].value
            ,primary: (part=="primary") ? selection.elements[0].key : d.other
            ,secondary: (part=="primary") ? d.other : selection.elements[0].key
          });
          yh1 += (e.height*d.sum)/e.elements[0].value;
        });

        selectionBars.push(e);


        g.selectAll(".selectionBars")
        .data(selectionBars)
        .enter()
        .append("g")
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .attr("class","selectionBars")
        .append("rect")
        .attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)

        g.selectAll(".selectionEdges")
        .data(selectionEdges)
        .enter()
        .append("path")
        .attr("class","selectionEdges")
        .attr("d",function(d){ return d.path; })
        .on("mousemove", mousemoveEdge)
        .on("mouseout", mouseoutEdge)

        function mousemoveEdge(d){
          g.selectAll(".selectionEdges")
            .style("fill-opacity", 0.2);
          this.style.fillOpacity = 0.8;
          updateToolTip(d3.event, d.primary+" \u2192 "+d.secondary, format(d.sum)+" / "+format(d.totalSum));

          g.selectAll(".histogramBars").selectAll(".label")
            .style("fill-opacity", function(f){ return (f.elements[0].key == d.primary || f.elements[0].key == d.secondary) ? 1 : 0.2 });

          g.selectAll(".selectionBars").selectAll("rect")
            .style("fill-opacity", function(f){ return (f.other == d.key || f.other == d.secondary) ? 1 : 0.2 });
        }
        function mouseoutEdge(d){
          g.selectAll(".selectionEdges")
            .style("fill-opacity", 0.8);

          g.selectAll(".histogramBars").selectAll(".label")
            .style("fill-opacity", 1);

          g.selectAll(".selectionBars").selectAll("rect")
            .style("fill-opacity", 1);

          $("#tooltip").hide();
        }
      }

      bP.update2 = function(_data){
        data = _data.data;
        histogramData = d3.map(_data.clusters);
        var b1 = bP.bars();
        var dur = bP.duration();

        var sb = g.selectAll(".subBars").data(b1.subBars);

        sb.transition().duration(dur)
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect")
        .attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh)
        .style("fill", function(d){ return bP.fillSubBars(d); });

        sb.enter()
        .append("g")
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .attr("class","subBars")
        .append("rect")
        .attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh)
        .style("fill", function(d){ return bP.fillSubBars(d); });

        sb.exit().remove();

        var ed = g.selectAll(".edges").data(b1.edges, function(d){return d.id;})

        ed.enter()
        .append("path")
        .attr("class","edges")
        .attr("d",function(d){ return d.path; })
        .style("fill-opacity",bP.edgeOpacity())
        .style("fill", fillEdges);

        ed.transition().duration(dur)
        .attr("d",function(d){ return d.path; })
        .style("fill-opacity",bP.edgeOpacity())
        .style("fill", fillEdges);

        ed.exit().remove();

        var hb = g.selectAll(".histogramBars").data(b1.histogramBars, function(d){return d.id;})

        hb.transition().duration(dur)
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect")
        .attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)
        .style("fill",fillHistogram)

        var hb_enter = hb.enter()
        .append("g")
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .attr("class","histogramBars")

        hb_enter.append("rect")
        .attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)
        .style("fill",fillHistogram)
        // .style("fill-opacity",1)

        hb.exit().remove();

        var mb = g.selectAll(".mainBars").data(b1.mainBars);

        mb.transition().duration(dur)
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect")
        .attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh)
        .style("fill-opacity",0);

        var mb_enter = mb.enter()
        .append("g")
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .attr("class","mainBars");

        mb_enter.append("rect")
        .attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh)
        .style("fill-opacity",0)
        // .on("mouseover",bP.mouseover)
        // .on("mouseout",bP.mouseout);


        mb.exit().remove()

        return {"hb": hb_enter, "mb": mb_enter};
      }
      bP.update = function(_data){
        data = _data;
        var b1 = bP.bars();
        var dur = bP.duration();

        g.selectAll(".subBars").data(b1.subBars).transition().duration(dur)
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect")
        .attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh);

        g.selectAll(".edges").data(b1.edges).transition().duration(dur)
        .attr("d",function(d){ return d.path; })
        .style("fill-opacity",bP.edgeOpacity())

        g.selectAll(".mainBars").data(b1.mainBars).transition().duration(dur)
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect")
        .attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh)
        .style("fill-opacity",0)
      }
      bP.mouseover = function(d){
        var newbars = bP.bars(d);
        g.selectAll(".mainBars").filter(function(r){ return r.part===d.part && r.key === d.key})
        .select("rect").style("stroke-opacity", 1);

        g.selectAll(".subBars").data(newbars.subBars)
        .transition().duration(bP.duration())
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect").attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh)
        .style("fill", function(d){ return bP.fillSubBars(d); });

        var e = g.selectAll(".edges")
        .data(newbars.edges);

        e.filter(function(t){ return t[d.part] === d.key;})
        .transition().duration(bP.duration())
        .style("fill-opacity",bP.edgeOpacity())
        .style("fill", fillEdges)
        .attr("d",function(d){ return d.path});

        e.filter(function(t){ return t[d.part] !== d.key;})
        .transition().duration(bP.duration())
        .style("fill-opacity",0)
        .style("fill", fillEdges)
        .attr("d",function(d){ return d.path});

        g.selectAll(".mainBars").data(newbars.mainBars)
        .transition().duration(bP.duration())
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect").attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh)

        // g.selectAll(".histogramBars").data(newbars.histogramBars)
        // .transition().duration(bP.duration())
        // .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        // .select("rect").attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)

        hb = g.selectAll(".histogramBars").data(newbars.histogramBars, function(d){return d.id;})

        hb.transition().duration(bP.duration())
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect").attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)
        .style("fill",fillHistogram)

        var hb_enter = hb.enter()
        .append("g")
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .attr("class","histogramBars")

        hb_enter.append("rect")
        .attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)
        .style("fill",fillHistogram)

        hb.exit().remove();

        // g.selectAll(".histogramBars").remove();
        //
        // g.selectAll(".histogramBars")
        //   .data(newbars.histogramBars)
        //   .enter()
        //   .append("g")
        //   .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        //   .attr("class","histogramBars")
        //   .append("rect")
        //   .attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)
        return hb_enter;
      }
      bP.mouseout = function(d){
        var newbars = bP.bars();

        g.selectAll(".mainBars").filter(function(r){ return r.part===d.part && r.key === d.key})
        .select("rect").style("stroke-opacity", 0);

        g.selectAll(".subBars").data(newbars.subBars)
        .transition().duration(bP.duration())
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect").attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh)
        .style("fill", function(d){ return bP.fillSubBars(d); });;

        g.selectAll(".edges").data(newbars.edges)
        .transition().duration(bP.duration())
        .style("fill-opacity",bP.edgeOpacity())
        .style("fill", fillEdges)
        .attr("d",function(d){ return d.path});

        g.selectAll(".mainBars").data(newbars.mainBars)
        .transition().duration(bP.duration())
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect").attr("x",fx).attr("y",fy).attr("width",fw).attr("height",fh);

        // g.selectAll(".histogramBars").data(newbars.histogramBars)
        // .transition().duration(bP.duration())
        // .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        // .select("rect").attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)

        hb = g.selectAll(".histogramBars").data(newbars.histogramBars, function(d){return d.id;})

        hb.transition().duration(bP.duration())
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .select("rect").attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)
        .style("fill",fillHistogram)

        var hb_enter = hb.enter()
        .append("g")
        .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        .attr("class","histogramBars")

        hb_enter.append("rect")
        .attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)
        .style("fill",fillHistogram)

        hb.exit().remove();

        // g.selectAll(".histogramBars").remove();
        //
        // g.selectAll(".histogramBars")
        //   .data(newbars.histogramBars)
        //   .enter()
        //   .append("g")
        //   .attr("transform", function(d){ return "translate("+d.x+","+d.y+")";})
        //   .attr("class","histogramBars")
        //   .append("rect")
        //   .attr("x",fhx).attr("y",fhy).attr("width",fhw).attr("height",fhh)
        return hb_enter;
      }

      function edgeVert(x1,y1,x2,y2,x3,y3,x4,y4){
        var mx1=(x1+x2)/2,mx3=(x3+x4)/2;
        return ["M",x1,",",y1,"C",mx1,",",y1," ",mx1,",",y2,",",x2,",",y2,"L"
        ,x3,",",y3,"C",mx3,",",y3," ",mx3,",",y4,",",x4,",",y4,"z"].join("");
      }

      function fx(d){ return -d.width}
      function fy(d){ return -d.height}
      function fw(d){ return 2*d.width}
      function fh(d){ return 2*d.height}

      function fhx(d){ return d.dx}
      function fhy(d){ return d.dy}
      function fhw(d){ return d.width}
      function fhh(d){ return d.height}

      return bP;
    }
    this.viz=viz;
  }();
