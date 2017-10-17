function histogram(data){

  console.log("row clusters")
  for(i in data.clusters){
    c = data.clusters[i];
    c_rows = d3.map(c.rows);
    // console.log(c_rows);

    x = d3.scaleLinear().domain([0, d3.max(c_rows.values())]);
    // console.log(d3.extent(c_rows.values()), x.ticks(8));
    h = d3.histogram().value(function(d) { return d.value; })
      .domain(x.domain())
      .thresholds(x.ticks(8));

    bins = h(c_rows.entries());
    // console.log(h);
    console.log(i, bins);
  }
  console.log("column clusters")
  for(i in data.clusters){
    c = data.clusters[i];
    c_rows = d3.map(c.columns);
    // console.log(c_rows);

    x = d3.scaleLinear().domain([0, d3.max(c_rows.values())]);
    // console.log(d3.extent(c_rows.values()), x.ticks(8));
    h = d3.histogram().value(function(d) { return d.value; })
      .domain(x.domain())
      .thresholds(x.ticks(8));

    bins = h(c_rows.entries());
    // console.log(h);
    console.log(i, bins);
  }
}
