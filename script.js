// visualisation settings
var vis = {
    width: 800,
    height: 800,
    
    donutWidth: 75,

    legendWidth: 300,
    legendRectSize: 18,
    legendSpacing: 4
}

var radius = Math.min(vis.width, vis.height) / 2;
var arcLength = d3.scale.linear()
    .range([0, 2 * Math.PI]);
var arcDistance = d3.scale.linear()
    .range([0, radius]);

var x = d3.scale.linear().range([0, 2 * Math.PI]);
var y = d3.scale.pow().exponent(1).domain([0, 1]).range([0, radius]);
var padding = 10;
var duration = 1000;

// own scale ..     
var color = d3.scale.category20b();

// define partition size
var partition = d3.layout.partition()
    .value(function(d) { return d.size; })
    .sort(null);

// init arc donut ring
var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, arcLength(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, arcLength(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, arcDistance(d.y)); })
    .outerRadius(function(d) { return Math.max(0, arcDistance(d.y + d.dy)); });


// load and process data
d3.json("asyl.json", function(error, data) {
    if (error) throw error;

    draw(data);
});


// define svg element, that is locatet in the middle of diagram
var svg = d3.select('#chart')
    .append("svg")
    .attr("width", vis.width + vis.legendWidth)
    .attr("height", vis.height)
    .append("g");


//arcPart group
svg.append("g")
    .attr('class', "slices");
svg.append("g")
    .attr('class', "labels");

/*    //arcPart group
arcPartGroup = svg.append("g");

slice = arcPartGroup.append("slices")
    .attr('class', "slices");

labels = arcPartGroup.append("labels")
    .attr('class', "labels");*/


svg.attr("transform", "translate(" + vis.width / 2 + "," + (vis.height / 2) + ")");


function draw(data)
{
    var totalSize = data.size;

    // create arc visualisation
    console.log("call draw method:");


    // *********************    tooltip / infobox   ******************************** //
    var tooltip = d3.select('#chart')
        .append('div')
        .attr('class', 'tooltip');
    tooltip.append('div')
        .attr('class', 'label');
    tooltip.append('div')
        .attr('class', 'count');
    tooltip.append('div')
        .attr('class', 'percent');
    tooltip.append('div')
        .attr('class', 'percent-to-parent');


    // ********************     pie slices      ************************************** //
    var slice = svg.select(".slices").selectAll("path.slice")
        .data(partition.nodes(data));


    slice.enter()
        .insert("path")
        .style("fill", function(d) { return color(d.name); })
        .attr('class', "slice")
        .attr("id", function(d, i) { return "path-" + i; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .on("click", clickSlice);

    slice.on('mouseover', function(d) {
        var parentSize = (typeof d.parent == "undefined") ? d.value : d.parent.size ;

        var percent = Math.round(1000 * d.value / totalSize) / 10;
        var parentPercent = Math.round(1000 * d.value / parentSize) / 10;
        tooltip.select('.label').html('<b>' + d.name + '</b>' );
        tooltip.select('.count').html('count: ' + d.size); 
        tooltip.select('.percent').html('total percent: ' + percent + '%'); 
        tooltip.select('.percent-to-parent').html('percent to parent: ' + parentPercent + '%'); 
        tooltip.style('display', 'block');
        
        // var enabled = d3.select(this).attr('class')
        var toSmall = d3.select(this).empty();
        console.log("data name: " + d.name + "  depth: " + d.depth + "  visible? : " + toSmall);
    });

    slice.on('mouseout', function(d) {
        tooltip.style('display', 'none');
    });

    slice.on('mousemove', function(d) {
        tooltip.style('left', (d3.event.pageX) + 'px')
               .style('top', (d3.event.pageY) + 'px');
    });

    slice.exit()
        .remove();
    // ***************************************************************************** //



    // **************************     label            ***************************** //
    var text = svg.select(".labels").selectAll("text")
        .data(partition.nodes(data));

    text.enter()
        .append("text")
        .attr("dy", ".35em")
        .attr("id", function(d, i) { return "label-" + i; })
        .attr("display", function(d) { if (d.size ==  0) return "none";})
        .style("text-anchor", "middle")
        .attr("transform", function(d) { 
          return "translate(" + arc.centroid(d) + ")"; 
        })
        .text(function(d) { return d.name; });

    function midAngle(d){
        return d.startAngle + (d.endAngle - d.startAngle)/2;
    }

    text.exit()
        .remove();
    // ***************************************************************************** //

    function updateSlices(d){
        slice.transition()
        .duration(duration)
        .attrTween("d", arcTween(d))
        .each("end", updateLabels);
    }
    function updateLabels(d){
        text.transition().duration(duration)
        .attr("transform", function(d) { 
          return "translate(" + arc.centroid(d) + ")"; 
        })
        .attr("display", function(d) {if (this.x < 0.1 && this.y > -0.1) return "none";});
    }

    function clickSlice(d){
        updateSlices(d);
        updateLabels(d);
    }
}

// Interpolate the scales!
function arcTween(d) {
  var xd = d3.interpolate(arcLength.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(arcDistance.domain(), [d.y, 1]),
      yr = d3.interpolate(arcDistance.range(), [d.y ? 20 : 0, radius]);
  return function(d, i) {
    return i
        ? function(t) { return arc(d); }
        : function(t) { arcLength.domain(xd(t)); arcDistance.domain(yd(t)).range(yr(t)); return arc(d); };
  };
}

