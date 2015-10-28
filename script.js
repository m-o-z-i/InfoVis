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

    draw(data, setup(data));
});


function setup (data) {

    // define svg element, that is locatet in the middle of diagram
    var svg = d3.select('#chart')
        .append("svg")
        .attr("width", vis.width + vis.legendWidth)
        .attr("height", vis.height)
        .append("g")
        .attr("transform", "translate(" + vis.width / 2 + "," + (vis.height / 2) + ")");

    //group
    var arcPart = svg.append("g");

    // map data to donut part
    var path = svg.selectAll("path")
        .data(partition.nodes(data))
        .enter().append("path");

    // labeling
    var label = svg.selectAll("text")
        .data(partition.nodes(data))
        .enter().append("text");

    var values = [svg, path, label, arcPart];

    return values;
}

function draw(data, setup)
{
    var svg     = setup[0];
    var path    = setup[1];
    var label   = setup[2];
    var arcPart = setup[3];

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


    // ********************     arc Part      ************************************** //
    path.attr("id", function(d, i) { return "path-" + i; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", function(d) { return color(d.name); })
        .on("click", clickPath);

    path.on('mouseover', function(d) {
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

    path.on('mouseout', function(d) {
        tooltip.style('display', 'none');
    });

    path.on('mousemove', function(d) {
        tooltip.style('left', (d3.event.pageX) + 'px')
               .style('top', (d3.event.pageY) + 'px');
    });
    // ***************************************************************************** //



    // **************************     label            ***************************** //
    label.attr("id", function(d, i) { return  i; })
        .attr("transform", function(d) { 
          return "translate(" + arc.centroid(d) + ")"; 
        })
        .attr("dy", ".35em")
        .attr("display", function(d) { if (d.size ==  0) return "none";})
        .style("text-anchor", "middle")
        .text(function(d) { return d.name; });
    // ***************************************************************************** //

    
    // *******************************     legend   ********************************* //
    var legend = svg.selectAll('.legend')                    
        .data(color.domain())                                  
        .enter()                                               
        .append('g')                                           
        .attr('class', 'legend')                               
        .attr('transform', function(d, i) {                    
            var height = vis.legendRectSize + vis.legendSpacing;         
            var offset =  height * color.domain().length / 2;    
            var horz = vis.width/2 + 100 -2 * vis.legendRectSize;                      
            var vert = i * height - offset;                      
            return 'translate(' + horz + ',' + vert + ')';       
    }); 

    legend.append('rect')                                       
        .attr('width', vis.legendRectSize)                         
        .attr('height', vis.legendRectSize)                        
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
        //updatePie(partition.nodes(data.depth));
    }
    // ***************************************************************************** //              


    function clickPath(d) {
        var bbox = this.getBBox();

        path.attr('display', function(d) {if (bbox.width < 0.1) return "none";});

        console.log("path pos: " + bbox.width);
        console.log("data name: " + d.name + "  x: " + d.x + "  dx; " + d.dx+ "  y: " + d.y + "  d.dy:" + d.dy);

        label.attr("transform", function(d) { 
          return "translate(" + arc.centroid(d) + ")"; 
        })
        .attr("dy", ".35em")
        .attr("display", function(d) { 
            if (d.size ==  0 || this.getBBox.width < 0.1) return "none";
        })
        .style("text-anchor", "middle")
        .text(function(d) { return d.name; });

        updatePie(d);
        updateLabels(d);
    }

    function updatePie(d){
        path.transition()
        .duration(750)
        .attrTween("d", arcTween(d));
    }

    function updateLabels(d){


        
    }


}

function isParentOf(p, c) {
  if (p === c) return true;
  if (p.children) {
    return p.children.some(function(d) {
      return isParentOf(d, c);
    });
  }
  return false;
}

function colour(d) {
  if (d.children) {
    // There is a maximum of two children!
    var colours = d.children.map(colour),
        a = d3.hsl(colours[0]),
        b = d3.hsl(colours[1]);
    // L*a*b* might be better here...
    return d3.hsl((a.h + b.h) / 2, a.s * 1.2, a.l / 1.2);
  }
  return d.colour || "#fff";
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

