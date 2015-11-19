// visualisation settings
var vis = {
    width: 800,
    height: 800,
    
    donutWidth: 75
}

var radius = Math.min(vis.width, vis.height) / 2;
var arcLength = d3.scale.linear().range([0, 2 * Math.PI]);
var arcDistance = d3.scale.linear().range([0, radius]);

var duration = 1000;

// define partition size
var partition = d3.layout.partition()
    //.sort(null);
    .value(function(d) { return d.size; });

// init arc donut ring
var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, arcLength(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, arcLength(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, arcDistance(d.y)); })
    .outerRadius(function(d) { return Math.max(0, arcDistance(d.y + d.dy)); });


// load and process data
d3.json("asyl.json", function(error, data) {
    if (error) throw error;
    //console.log(data);
    draw(data);
});


// define svg element, that is locatet in the middle of diagram
var svg = d3.select('#cirlceSet')
    .append("svg")
    .attr("width", vis.width)
    .attr("height", vis.height)
    .append("g");
svg.attr("transform", "translate(" + vis.width / 2 + "," + (vis.height / 2) + ")");

// add slices to DOM
svg.append("g")
    .attr('class', "slices");

// add labels to DOM
svg.append("g")
    .attr('class', "labels");

// add tooltip to DOM
var tooltip = d3.select('#cirlceSet')
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

function draw(data)
{
    var totalSize = data.size;

    // create arc visualisation
    //console.log("call draw method:");

    // *********************    tooltip / infobox   ******************************** //
    var tooltip = d3.select('.tooltip')


    // ********************     pie slices      ************************************** //
    var slice = svg.select(".slices").selectAll("path.slice")
        .data(partition.nodes(data));

    slice.enter()
        .append("path")
        .attr('class', "slice")
        .attr("id", function(d, i) { return "path-" + i; })
        .attr("d", arc)
        .attr('display', function(d, i) {if(i==0) return "none";});

    slice.on('mouseenter', function(d) {
        var parentSize = (typeof d.parent == "undefined") ? d.value : d.parent.size ;

        var percent = Math.round(1000 * d.value / totalSize) / 10;
        var parentPercent = Math.round(1000 * d.value / parentSize) / 10;
        tooltip.select('.label').html('<b>' + d.name + '</b>' );
        tooltip.select('.count').html('count: ' + d.size); 
        tooltip.select('.percent').html('total percent: ' + percent + '%'); 
        tooltip.select('.percent-to-parent').html('percent to parent: ' + parentPercent + '%'); 
        tooltip.style('display', 'block');
    });
    slice.on('mousemove', function(d) {
        tooltip.style('left', (d3.event.pageX + 2) + 'px')
               .style('top', (d3.event.pageY + 2) + 'px');
    });

    slice.on('mouseleave', function(d) {
        tooltip.style('display', 'none');
    });

    slice.exit()
        .remove();
    // ***************************************************************************** //

    // **************************     label            ***************************** //
    var text = svg.select(".labels").selectAll("text")
        .data(partition.nodes(data));

    var removeTSpan = d3.selectAll('.secondRow')
    removeTSpan.remove();

    var textEnter = text.enter().append("text")
        .attr('class', function(d, i) {
            if (i == 0) return "title";
            else return "label";
        })
        .attr("pointer-events", "none")
        .attr("dy", ".35em")
        .attr("id", function(d, i) { return "label-" + i; })
        .attr("display", function(d, i) { if (d.size ==  0) return "none";})
        .attr("transform", function(d, i) { 
            if (i != 0) return "translate(" + arc.centroid(d) + ")";
        })
        .text(function(d) { return d.name; });

    textEnter.append("tspan")
        .attr("x", 0)
        .attr("dy", "1em")
        .text(function(d, i) { if (i==0) return d.size; });

    text.exit()
        .remove();
    // ***************************************************************************** //
}



