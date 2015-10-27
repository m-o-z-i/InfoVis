/* ### QUESTIONS ### 
/*  what is d
/*  auto complete... (plugins)
/*  how to change order per drag and drop
/* ################# */


// init values
var width = 800,
    height = 800,
    legendWidth = 300,
    radius = Math.min(width, height) / 2,
    padding = 5,
    donutWidth = 75,
    arcSpace = 0,
    legendRectSize = 18,
    legendSpacing = 4;

var color = d3.scale.category20b();
// own scale .. 

var arcLength = d3.scale.linear()
    .range([0, 2 * Math.PI]);

var arcDistance = d3.scale.linear()
    .range([0, radius]);

// define svg element, that is locatet in the middle of diagram
var svg = d3.select('#chart')
    .append("svg")
    .attr("width", width + legendWidth)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")");

// define partition size
var partition = d3.layout.partition()
    .value(function(d) { return d.size; })
    .sort(null);

// init arc donut ring
var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, arcLength(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, arcLength(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, arcDistance(d.y) + arcSpace); })
    .outerRadius(function(d) { return Math.max(0, arcDistance(d.y + d.dy)); });


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

// for each data
d3.json("asyl.json", function(error, data) {
    if (error) throw error;

    var total = data.size;
    console.log("total data size: " + total);
    console.log("data name: " + data.name);
    console.log("data id: " + partition.nodes(data).indexOf(data));

    // map data to donut part
    var path = svg.selectAll("path")
        .data(partition.nodes(data))
        .enter().append("path")
        .attr("id", function(d, i) { return "path-" + i; })
        .attr("display", function(d) { if (/*d.size < 5 || !d.depth*/false) return "none";}) // hide inner ring
        .attr("d", arc)
        .style("fill", function(d) { return color( d.name); })
        .each(function(d){ this._current = d })
        .on("click", clickPath);

    var text = svg.selectAll("text")
        .data(partition.nodes(data))
        .enter()
        .append("text")
        .attr("x", function(d) { return arc.centroid(d)[0]} )
        .attr("y", function(d) { return arc.centroid(d)[1]} )
        // .attr("transform", function(d) { 
        //   return "translate(" + arc.centroid(d) + ")"; 
        // })
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .text(function(d) { return d.name; })


    path.on('mouseover', function(d) {
        var parentSize = (typeof d.parent == "undefined") ? d.value : d.parent.size ;

        var percent = Math.round(1000 * d.value / total) / 10;
        var parentPercent = Math.round(1000 * d.value / parentSize) / 10;
        tooltip.select('.label').html('<b>' + d.name + '</b>' );
        //tooltip.select('.count').html('count: ' + d.size); 
        tooltip.select('.percent').html('total percent: ' + percent + '%'); 
        tooltip.select('.percent-to-parent').html('percent to parent: ' + parentPercent + '%'); 
        tooltip.style('display', 'block');
        
        var enabled = d3.select(this).attr('class')
        // console.log("data name: " + d.name + "  depth: " + d.depth + "  enabled: " + enabled);
    });

    path.on('mouseout', function(d) {
        tooltip.style('display', 'none');
    });

    path.on('mousemove', function(d) {
        tooltip.style('left', (d3.event.pageX) + 'px')
               .style('top', (d3.event.pageY) + 'px');
    });


    var legend = svg.selectAll('.legend')                    
        .data(color.domain())                                  
        .enter()                                               
        .append('g')                                           
        .attr('class', 'legend')                               
        .attr('transform', function(d, i) {                    
            var height = legendRectSize + legendSpacing;         
            var offset =  height * color.domain().length / 2;    
            var horz = width/2 + 100 -2 * legendRectSize;                      
            var vert = i * height - offset;                      
            return 'translate(' + horz + ',' + vert + ')';       
    }); 

    legend.append('rect')                                       
        .attr('width', legendRectSize)                         
        .attr('height', legendRectSize)                        
        .style('fill', color)                                  
        .style('stroke', color)
        .on('click', clickLegend);                

    function clickLegend(d) {
        var rect = d3.select(this);
        var enabled = true;

        if (rect.attr('class') === 'disabled') {
            rect.attr('class', '');
        } else {
            rect.attr('class', 'disabled');
            enabled = false;
        }
        updatePie(partition.nodes(data.depth));
    }

    function clickPath(d) {
        console.log("data name: " + d.name + "  x: " + d.x + "  dx; " + d.dx+ "  y: " + d.y + "  d.dy:" + d.dy);
        updatePie(d);
    }

    function updatePie(d){
        path.transition()
        .duration(750)
        .attrTween("d", arcTween(d));
    }
});

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

function tween(d) {
    window.alert("stop");  
    return arc(d);
}