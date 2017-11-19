var xf,
    rechtstraegerDim,
    quartalDim,
    bekanntgabeDim,
    mediumDim,
    euroDim;

var format = function(d) { return locale.format(",.2f")(d)+"€"; }
var spinner = new Spinner().spin(document.getElementById("mainview"));
var wasFiltered = false;
var barchart, barchart_law;
var sankeychart;
var annularchart;
var searchbar;
var rechtstraegerTable, mediumTable;
var allClusters;

d3.queue()
    .defer(d3.json, "getData")
    // .defer(function(d){ d3.json("/setNumClusters").header("Content-Type", "application/json").post(9,function(e){return});},  true)
    // .defer(d3.json, "/getClusters")
    .await(makeGraphs);

function makeGraphs(error, data/*, clusters*/) {
  console.log(data)
  // console.log(clusters)
  // spinner.stop();

  // allClusters = clusters;

  xf = crossfilter(data)
  rechtstraegerDim = xf.dimension(function(d) { return d.RECHTSTRAEGER; });
  quartalDim = xf.dimension(function(d) { return d.QUARTAL; });
  bekanntgabeDim = xf.dimension(function(d) { return d.BEKANNTGABE; });
  mediumDim = xf.dimension(function(d) { return d.MEDIUM_MEDIENINHABER; });
  euroDim  = xf.dimension(function(d) { return d.EURO; });

  var s = d3.scaleLinear().range([2,9]).domain([400,1100])
  var num_clusters = Math.round(s(document.getElementById("mainview").offsetHeight));
  // var data_filtered = bekanntgabeDim.filterFunction(function(f) { return (f==2 || f==4); }).top(Infinity);
  bekanntgabeDim.filterFunction(function(f) { return (f==2 || f==4); });
  var data_filtered = {BEKANNTGABE: [2,4]};

  d3.json("setNumClusters")
    .header("Content-Type", "application/json")
    .post(num_clusters, function(e){

      d3.json("getClusters")
        .header("Content-Type", "application/json")
        .post(JSON.stringify(data_filtered), function(d){
          console.log(d);
          // updateAll(d);
          spinner.stop();

          createTables();
          barchart = createBarchart();
          barchart_law = createBarchart_law();
          sankeychart = sankey(d);
          updateAll();
        });

    });
}

function createTables(){
  rechtstraegerTable = $('#tableOrganisations').DataTable({
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
          { title: "Rechtsträger" },
          { title: "Euro", render: function (data, type, row) {
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

  rechtstraegerTable.on("dblclick", "tr", function(d){
    var row = rechtstraegerTable.row(this).data();

    mediumDim.filterAll();
    rechtstraegerDim.filter(row[0]);
    var data = mediumDim.group().reduceSum(function(d){ return d.EURO; }).top(Infinity);
    data = data.filter(function(d){ return d.value >= 1; });
    updateAll();

    row = rechtstraegerTable.row(this).data();
    var info = {name: row[0], sum: format(row[1]), type: "Rechtsträger"};
    annularchart = annular(data, info);

    // rechtstraegerTable.rows("#"+row[0]).select();
    rechtstraegerTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
    setTimeout(function(){ rechtstraegerTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
  });

  rechtstraegerTable.on("select", function(e, dt, type, indexes){
    var row = rechtstraegerTable.row(dt).data();
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

  rechtstraegerTable.on("deselect", function(){
    sankeychart.selectedHistogramF(false);
    sankeychart.mouseoutHistogramLabel();
  });

  mediumTable = $('#tableMedia').DataTable({
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
          { title: "Medium" },
          { title: "Euro", render: function (data, type, row) {
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

  mediumTable.on("dblclick", "tr", function(d){
    var row = mediumTable.row(this).data();

    rechtstraegerDim.filterAll();
    mediumDim.filter(row[0]);
    var data = rechtstraegerDim.group().reduceSum(function(d){ return d.EURO; }).top(Infinity);
    data = data.filter(function(d){ return d.value >= 1; });
    updateAll();

    row = mediumTable.row(this).data();
    var info = {name: row[0], sum: format(row[1]), type: "Medium"};
    annularchart = annular(data, info);

    // mediumTable.rows("#"+row[0]).select();
    mediumTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
    setTimeout(function(){ mediumTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
  });

  mediumTable.on("select", function(e, dt, type, indexes){
    var row = mediumTable.row(dt).data();
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

  mediumTable.on("deselect", function(){
    sankeychart.selectedHistogramF(false);
    sankeychart.mouseoutHistogramLabel();
  });
}

function updateTables(newData){
  var newData = rechtstraegerDim.group()
    .reduceSum(function(d) { return d.EURO; })
    .top(Infinity)
    .filter(d=>d.value>=1)
    .map(function(d){ return [d.key, d.value]; });

  rechtstraegerTable.clear().rows.add(newData).draw();

  newData = mediumDim.group()
    .reduceSum(function(d) { return d.EURO; })
    .top(Infinity)
    .filter(d=>d.value>=1)
    .map(function(d){ return [d.key, d.value]; });

  mediumTable.clear().rows.add(newData).draw();
}

function resetAll(data){
  rechtstraegerDim.filterAll();
  quartalDim.filterAll();
  bekanntgabeDim.filterAll();
  mediumDim.filterAll();
  euroDim.filterAll();

  barchart.reset();
  barchart_law.reset();
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
  barchart.update();
  barchart_law.update();
  //update annular
  // if(document.getElementById("annular"))
  //   searchbar.trigger("select2:change");
}

function filterData(data){
  // console.log(data)
  spinner.spin(document.getElementById("mainview"));
  if(document.getElementById("annular") == null){
    var data_filtered = {BEKANNTGABE: barchart_law.getSelections(), QUARTAL: barchart.getSelections()};
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
    if(selInfo.type == "Rechtsträger"){
      mediumDim.filterAll();
      rechtstraegerDim.filter(selInfo.name);
      var data = mediumDim.group().reduceSum(function(d){ return d.EURO; }).top(Infinity);
      data = data.filter(function(d){ return d.value >= 1; });
      updateAll();

      var row = rechtstraegerTable.row("#"+selInfo.name.replace(/[()., ]/g,"")).data();
      if(row != undefined){
        var info = {name: row[0], sum: format(row[1]), type: "Rechtsträger"};
        annularchart = annular(data, info);
        rechtstraegerTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
        setTimeout(function(){ rechtstraegerTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
      }
      else{
        var info = {name: selInfo.name, sum: format(0), type: "Rechtsträger"};
        annularchart = annular(data, info);
      }
    }
    else{
      rechtstraegerDim.filterAll();
      mediumDim.filter(selInfo.name);
      var data = rechtstraegerDim.group().reduceSum(function(d){ return d.EURO; }).top(Infinity);
      data = data.filter(function(d){ return d.value >= 1; });
      updateAll();

      var row = mediumTable.row("#"+selInfo.name.replace(/[()., ]/g,"")).data();
      if(row != undefined){
        var info = {name: row[0], sum: format(row[1]), type: "Medium"};
        annularchart = annular(data, info);
        mediumTable.row("#"+row[0].replace(/[()., ]/g,"")).scrollTo();
        setTimeout(function(){ mediumTable.row("#"+row[0].replace(/[()., ]/g,"")).select(); }, delay);
      }
      else{
        var info = {name: selInfo.name, sum: format(0), type: "Medium"};
        annularchart = annular(data, info);
      }
    }
    // if(rechtstraegerTable.row(".selected")[0].length){
    //   rechtstraegerTable.row("#"+(rechtstraegerTable.row(".selected").data()[0][0]).replace(/[()., ]/g,"")).scrollTo(false);
    //   setTimeout(function(){ $(rechtstraegerTable.row("#"+rechtstraegerTable.rows(".selected").data()[0][0].replace(/[()., ]/g,"")).node()).trigger("dblclick"); }, delay);
    //
    //   // $("#tableOrganisations").find("tbody tr:eq("+rechtstraegerTable.rows({selected: true })[0][0]+")").trigger("dblclick");
    // }
    // else if(mediumTable.row(".selected")[0].length){
    //   mediumTable.row("#"+(mediumTable.row(".selected").data()[0][0]).replace(/[()., ]/g,"")).scrollTo(false);
    //   setTimeout(function(){ $(mediumTable.row("#"+mediumTable.rows(".selected").data()[0][0].replace(/[()., ]/g,"")).node()).trigger("dblclick"); }, delay);
    //
    //   // $("#tableMedia").find("tbody tr:eq("+mediumTable.rows({selected: true })[0]+")").trigger("dblclick");
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


  rechtstraegerDim.filterAll();
  mediumDim.filterAll();

  if(wasFiltered){
    filterData(rechtstraegerDim.top(Infinity));
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

function changeData(i){
  var route = (i==0) ? "getData" : "getDummyData";

  d3.select("#mainview").select("svg").remove();
  d3.select("#filterchart").select("svg").remove();
  d3.select("#barchart").select("svg").remove();

  d3.queue()
      .defer(d3.json, route)
      .await(makeGraphs);
}
