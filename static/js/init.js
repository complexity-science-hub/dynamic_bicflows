var xf,
    firstGroupDim,
    filterColumns,
    filterDims,
    secondGroupDim,
    valueDim;

var firstGroupIndex = null;
var secondGroupIndex = null;
var valueIndex = null;

var valueFormat = null;

var format = function(d) {
    let res = d;
    if (valueFormat.decimals && !isNaN(valueFormat.decimals)) {
        res = locale.format(",." + valueFormat.decimals + "f")(res);
    } else {
        res = locale.format(",")(res);
    }

    if (valueFormat.unit) {
        if (valueFormat.unitPosition == 'left') {
            if (valueFormat.unitSpace) {
                res = valueFormat.unit + " " + res;
            } else {
                res = valueFormat.unit + res;
            }
        } else {
            if (valueFormat.unitSpace) {
                res = res + " " + valueFormat.unit;
            } else {
                res = res + valueFormat.unit;
            }
        }
    }

    return res;
}

var spinner = new Spinner().spin(document.getElementById("mainview"));
var wasFiltered = false;
var barCharts;
var sankeychart;
var annularchart;
var searchbar;
var firstGroupTable, secondGroupTable;
var allClusters;

var groupedEntitiesName = "grouped entities";

/*d3.select("html").on("keydown", function(d){
  kc = d3.event.keyCode;
  if(kc == 49)
    changeData(0);
  if(kc == 50)
   changeData(1);
 })*/

d3.queue()
    .defer(d3.json, "getData")
    // .defer(function(d){ d3.json("/setNumClusters").header("Content-Type", "application/json").post(9,function(e){return});},  true)
    // .defer(d3.json, "/getClusters")
    .await(makeGraphs);

function makeGraphs(error, data/*, clusters*/) {
    if (!checkData(data)) {
        return;
    }
  //console.log(data);
  // console.log(clusters)
  // spinner.stop();

  // allClusters = clusters;

  xf = crossfilter(data)
  firstGroupDim = xf.dimension(function(d) { return getFirst(d); });

  createFilterDims(data);
  secondGroupDim = xf.dimension(function(d) {
      return getSecond(d);
  });
  valueDim  = xf.dimension(function(d) {
      return getValue(d);
  });

  var s = d3.scaleLinear().range([2,9]).domain([400,1100])
  var num_clusters = Math.round(s(document.getElementById("mainview").offsetHeight));
  var data_filtered = {};

  d3.json("getValueFormat", function(format) {
      valueFormat = format;

      d3.json("setNumClusters")
        .header("Content-Type", "application/json")
        .post(num_clusters, function(e){

          d3.json("getClusters")
            .header("Content-Type", "application/json")
            .post(JSON.stringify(data_filtered), function(d){
              //console.log(d);
              // updateAll(d);
              spinner.stop();

              createTables();

              barCharts = {};

              filterColumns.forEach(function(filterColumn) {
                  let newBarChart = createBarchart(filterDims[filterColumn], filterColumn);

                  barCharts[filterColumn] = newBarChart;
              });
              //barchart = createBarchart(timeDim);
              //barchart_law = createBarchart(bekanntgabeDim);
                //barchart_law = createBarchart_law();
              sankeychart = sankey(d);
              updateAll();
            });

        });
      });
}

function checkData(data) {
    if (data.length == 0) {
        alert("Data error: empty data file");

        return false;
    }

    if (data['errorCode']) {
        alert(data['message']);
        return false;
    }

    if (Object.keys(data[0]).length < 3) {
        alert("Data error: at least 3 columns are required [Group1;...;Group2;Value]");

        return false;
    }

    return true;
}

function createFilterDims(data) {
    filterColumns = Object.keys(data[0]);

    filterColumns.shift();    // remove group 1
    filterColumns.pop();      // remove value
    filterColumns.pop();      // remove group 2

    filterDims = {};

    filterColumns.forEach(function (filterColumn) {
        let newDim = xf.dimension(function(d) { return d[filterColumn]; });
        filterDims[filterColumn] = newDim;
    });
}

function createTables(){
  firstGroupTable = $('#tableOrganisations').DataTable({
      "order": [[ 1, "desc" ]],
      "rowId": function(d){ return d[0].replace(/[()., ]/g,"")},
      "bLengthChange": false,
      "searching": true,
      "select": {
            style: "single"
      },
      "deferRender": true,
      "scrollY": true,
      "scrollCollapse": true,
      "paging": true,
      "scroller": {
        displayBuffer: 20
      },
      "bInfo" : false,
      "columns": [
          { title: firstGroupIndex },
          { title: valueIndex, render: function (data, type, row) {
            if(type == "display")
                return format(data);
            return data;
            }
          }
      ],
      "columnDefs": [
          {"className": "dt-body-left", "targets": 0},
          {"className": "dt-body-right", "targets": 1},
          {
            render: function (data, type, full, meta) {
                return "<div class='text-wrap width-200'>" + data + "</div>";
            },
            targets: 0
          }
      ]
  });

  var newBodyHeight = $("#topOrganisations").height() - $(".dataTables_filter").outerHeight(true) - $(".dataTables_scrollHead").outerHeight(true);
  $(".dataTables_scrollBody")[0].style.height = newBodyHeight+"px";

  firstGroupTable.on("dblclick", "tr", function(d){
    var row = firstGroupTable.row(this).data();

    secondGroupDim.filterAll();
    firstGroupDim.filter(row[0]);
    var data = secondGroupDim.group().reduceSum(function(d){
        return getValue(d);
    }).top(Infinity);
    data = data.filter(function(d){ return d.value >= 1; });
    updateAll();

    row = firstGroupTable.row(this).data();
    var info = {name: row[0], sum: format(row[1]), type: firstGroupIndex};
    annularchart = annular(data, info);

    // firstGroupTable.rows("#"+row[0]).select();
    firstGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
    setTimeout(function(){ firstGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
  });

  firstGroupTable.on("select", function(e, dt, type, indexes){
    var row = firstGroupTable.row(dt).data();
    var selection;
    d3.selectAll(".histogramBars").selectAll(".label").selectAll(function(d){
      if(d.part == "primary" && d.elements.some(function(g){ return g.key == row[0]})){
        selection = d;
      }

    });
    if(selection != undefined){
      sankeychart.mouseoverHistogramLabel(selection);
      sankeychart.selectedHistogramF(selection);
      // sankeychart.mouseoverHistogramLabel(selection);
    }
  });

  firstGroupTable.on("deselect", function(){
    sankeychart.selectedHistogramF(false);
    sankeychart.mouseoutHistogramLabel();
  });

  secondGroupTable = $('#tableMedia').DataTable({
      "order": [[ 1, "desc" ]],
      "rowId": function(d){ return d[0].replace(/[()., ]/g,"")},
      "bLengthChange": false,
      "searching": true,
      "select": {
            style: 'single'
      },
      "deferRender": true,
      "scrollY": true,
      "scrollCollapse": true,
      "paging": true,
      "scroller": {
        displayBuffer: 20
      },
      "bInfo" : false,
      "columns": [
          { title: secondGroupIndex },
          { title: valueIndex, render: function (data, type, row) {
            if(type == "display")
                return format(data);
            return data;
            }
          }
      ],
      "columnDefs": [
          {"className": "dt-body-left", "targets": 0},
          {"className": "dt-body-right", "targets": 1},
          {
            render: function (data, type, full, meta) {
                return "<div class='text-wrap width-200'>" + data + "</div>";
            },
            targets: 0
          }
      ]
  });

  var newBodyHeight = $("#topMedia").height()- $(".dataTables_filter").outerHeight(true)- $(".dataTables_scrollHead").outerHeight(true);
  $(".dataTables_scrollBody")[1].style.height = newBodyHeight+"px";

  secondGroupTable.on("dblclick", "tr", function(d){
    var row = secondGroupTable.row(this).data();

    firstGroupDim.filterAll();
    secondGroupDim.filter(row[0]);
    var data = firstGroupDim.group().reduceSum(function(d){ return getValue(d); }).top(Infinity);
    data = data.filter(function(d){ return d.value >= 1; });
    updateAll();

    row = secondGroupTable.row(this).data();
    var info = {name: row[0], sum: format(row[1]), type: secondGroupIndex};
    annularchart = annular(data, info);

    // secondGroupTable.rows("#"+row[0]).select();
    secondGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
    setTimeout(function(){ secondGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
  });

  secondGroupTable.on("select", function(e, dt, type, indexes){
    var row = secondGroupTable.row(dt).data();
    var selection;
    d3.selectAll(".histogramBars").selectAll(".label").selectAll(function(d){
      if(d.part == "secondary" && d.elements.some(function(g){ return g.key == row[0]}))
        selection = d;
    });
    if(selection != undefined){
      sankeychart.mouseoverHistogramLabel(selection);
      sankeychart.selectedHistogramF(selection);
      // sankeychart.mouseoverHistogramLabel(selection);
    }
  });

  secondGroupTable.on("deselect", function(){
    sankeychart.selectedHistogramF(false);
    sankeychart.mouseoutHistogramLabel();
  });
}

function updateTables(newData){
  var newData = firstGroupDim.group()
    .reduceSum(function(d) {return getValue(d);})
    .top(Infinity)
    .filter(d=>d.value>=1)
    .map(function(d){return [d.key, d.value]; });

  firstGroupTable.clear().rows.add(newData).draw();

  newData = secondGroupDim.group()
    .reduceSum(function(d) { return getValue(d); })
    .top(Infinity)
    .filter(d=>d.value>=1)
    .map(function(d){ return [d.key, d.value]; });

  secondGroupTable.clear().rows.add(newData).draw();
}

function resetAll(data){
  firstGroupDim.filterAll();

  Object.keys(filterDims).forEach(function(key, index) {
     filterDims[key].filterAll();
  });

  secondGroupDim.filterAll();
  valueDim.filterAll();

  Object.keys(barCharts).forEach(function(key, index) {
     barCharts[key].reset();
  });
  //barchart.reset();
  //barchart_law.reset();
  // updateAll(data);
}

function updateAll(data){
  if(data != null){
    // console.log("Clusters",data.clusters)
    sankeychart.update(data);
    // createSankey(data);
    // histogram(data);
  }

  updateTables(data);
  Object.keys(barCharts).forEach(function(key, index) {
     barCharts[key].update();
  });
  //barchart.update();
  //barchart_law.update();
  //update annular
  // if(document.getElementById("annular"))
  //   searchbar.trigger("select2:change");
}

function filterData(data){
  // console.log(data)
  spinner.spin(document.getElementById("mainview"));
  if(document.getElementById("annular") == null){
    //var data_filtered = {BEKANNTGABE: barchart_law.getSelections(), QUARTAL: barchart.getSelections()};

      var data_filtered = {};

      filterColumns.forEach(function(filterColumn) {
          data_filtered[filterColumn] = barCharts[filterColumn].getSelections();
      });

    // if(barchart.hasSelections() || barchart_law.hasSelections()){
      d3.json("getClusters")
        .header("Content-Type", "application/json")
        .post(JSON.stringify(data_filtered), function(d){
          // console.log(d);
          sankeychart.openClustersF(["Home"]);

          updateAll(d);
          spinner.stop();
        });
    // }
    // else{
    //   updateAll(allClusters);
    //   spinner.stop();
    // }
  }

  else if(document.getElementById("annular")){
    var selInfo = annularchart.getInfo();
    if(selInfo.type == firstGroupIndex){
      secondGroupDim.filterAll();
      firstGroupDim.filter(selInfo.name);
      var data = secondGroupDim.group().reduceSum(function(d){ return getValue(d); }).top(Infinity);
      data = data.filter(function(d){ return d.value >= 1; });
      updateAll();

      var row = firstGroupTable.row("#"+selInfo.name.replace(/[()., ]/g,"")).data();
      if(row != undefined){
        var info = {name: row[0], sum: format(row[1]), type: firstGroupIndex};
        annularchart = annular(data, info);
        firstGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
        setTimeout(function(){ firstGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
      }
      else{
        var info = {name: selInfo.name, sum: format(0), type: firstGroupIndex};
        annularchart = annular(data, info);
      }
    }
    else{
      firstGroupDim.filterAll();
      secondGroupDim.filter(selInfo.name);
      var data = firstGroupDim.group().reduceSum(function(d){ return getValue(d); }).top(Infinity);
      data = data.filter(function(d){ return d.value >= 1; });
      updateAll();

      var row = secondGroupTable.row("#"+selInfo.name.replace(/[()., ]/g,"")).data();
      if(row != undefined){
        var info = {name: row[0], sum: format(row[1]), type: secondGroupIndex};
        annularchart = annular(data, info);
        secondGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
        setTimeout(function(){ secondGroupTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
      }
      else{
        var info = {name: selInfo.name, sum: format(0), type: secondGroupIndex};
        annularchart = annular(data, info);
      }
    }
    // if(firstGroupTable.row(".selected")[0].length){
    //   firstGroupTable.row("#"+(firstGroupTable.row(".selected").data()[0][0]).replace(/[()., ]/g,"")).scrollTo(false);
    //   setTimeout(function(){ $(firstGroupTable.row("#"+firstGroupTable.rows(".selected").data()[0][0].replace(/[()., ]/g,"")).node()).trigger("dblclick"); }, delay);
    //
    //   // $("#tableOrganisations").find("tbody tr:eq("+firstGroupTable.rows({selected: true })[0][0]+")").trigger("dblclick");
    // }
    // else if(secondGroupTable.row(".selected")[0].length){
    //   secondGroupTable.row("#"+(secondGroupTable.row(".selected").data()[0][0]).replace(/[()., ]/g,"")).scrollTo(false);
    //   setTimeout(function(){ $(secondGroupTable.row("#"+secondGroupTable.rows(".selected").data()[0][0].replace(/[()., ]/g,"")).node()).trigger("dblclick"); }, delay);
    //
    //   // $("#tableMedia").find("tbody tr:eq("+secondGroupTable.rows({selected: true })[0]+")").trigger("dblclick");
    // }
    spinner.stop();
  }
  else{
    updateAll();
    spinner.stop();
  }
}

function backToSankey(){
  if(document.getElementById("annular") != null)
    document.getElementById("annular").remove();


  firstGroupDim.filterAll();
  secondGroupDim.filterAll();

  if(wasFiltered){
    filterData(firstGroupDim.top(Infinity));
    wasFiltered = false;
  }
  else
    updateAll();

  sankeychart.selectedHistogramF(false);
  sankeychart.mouseoutHistogramLabel();

  document.getElementById("sankey").style.display = null;

  // $("#cb_scroll_label").show();
  $("#info").hide();
  // if(sankeychart.openClusters.length > 0) $("#progress").show();//$("#back").show();
  $("#backToSankey").hide();
}

function back(){
  var cID = sankeychart.openClusters.pop();
  spinner.spin(document.getElementById("mainview"));
  d3.json("/removeSubClusters/"+cID, function(f){
    spinner.stop();
    sankeychart.update(f);
  })
  $("#back").hide();
}

function updateToolTip(e, title, sum, subtotal) {
  var top = e.pageY+10;
  var left = e.pageX+10;
  if((document.getElementById("mainview").offsetWidth - left) < 110 )
    left -= 150;
  if((document.getElementById("mainview").offsetHeight - top) < 60 )
    top -= 60;

  d3.select("#tooltip")
    .style("top", top+"px")
    .style("left", left+"px");

  $("#tooltiptitle").text(title);
  // $("#tooltipsubtotal").text(subtotal);
  $("#tooltipsum").text(sum);
  $("#tooltip").show();
}

/*function changeData(i){
  var route = (i==0) ? "getData" : "getDummyData";

  d3.select("#mainview").select("svg").remove();
  d3.select("#filterchart").select("svg").remove();
  d3.select("#barchart").select("svg").remove();

  d3.queue()
      .defer(d3.json, route)
      .await(makeGraphs);

  firstGroupTable.columns(0).header().to$().text("User")
  secondGroupTable.columns(0).header().to$().text("Movie")
}*/

function getFirst(d) {
    if (firstGroupIndex == null) {
        firstGroupIndex = Object.keys(d)[0];
    }

    return d[firstGroupIndex];
}

function getSecond(d) {
    if (secondGroupIndex == null) {
        var dKeys = Object.keys(d);
        secondGroupIndex = dKeys[dKeys.length - 2];
    }

    return d[secondGroupIndex];
}

function getValue(d) {
    if (valueIndex == null) {
        var dKeys = Object.keys(d);
        valueIndex = dKeys[dKeys.length - 1];
    }

    return d[valueIndex];
}
