d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};


var highlightHelperCircle = {name:"", path:"", parents:true};
var highlightHelperParallel = {name:"", path:"", parents:true};
var dragHelperCircle = {x:0, y:0, depth:0, drag:""};
var dragHelperParallel = {x:0, y:0, depth:0, drag:""};

var drag = d3.behavior.drag();

// color
var hue = d3.scale.ordinal()
  .domain([0,1,2,3,4,5,6,7,8,9])
  .range(["#1f77b4", "#ff7f0e", "#2ca02c", 
          "#d62728" , "#9467bd", "#8c564b", 
          "#e377c2" , "#7f7f7f", "#bcbd22", "#17becf"]);
var saturation = d3.scale.linear()
    .domain([1, 4])
    .clamp(true)
    .range([1.0, .7]);
var lightness = d3.scale.linear()
    .domain([0, 7])
    .clamp(true)
    .range([0.7, 0.4]);

var duration = 500;
var padding = 10;
var dragging = false;

// ****************** Circle Set ********************
// visualisation settings
var circleVis = {
    width: 600,
    height: 600
}

var radius = Math.min(circleVis.width, circleVis.height) / 2;

// define partition size
var partition = d3.layout.partition()
    //.sort(null)
    .size([2 * Math.PI, radius])
    //.children(function(d) { return isNaN(d.value) ? d3.entries(d.size) : null; })
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return (d.y); })
    .outerRadius(function(d) { return (d.y + d.dy);});

// define svg element, that is locatet in the middle of diagram
var svgCircle = d3.select('#Visualisations')
    .on("click", mouseclick)
  .append("div")
    .attr('id', 'cirlceSetVis')
    .attr("width", circleVis.width)
    .attr("height", circleVis.height)
  .append("svg:svg")
    .attr('id', 'svgCircleSet')
    .attr("width", circleVis.width)
    .attr("height", circleVis.height)
  .append("svg:g")
    .attr("transform", "translate(" + circleVis.width / 2 + "," + (circleVis.height / 2) + ")");

var circleSetVis = d3.select('#cirlceSetVis');
var mouseSVG = d3.select("#cirlceSetVis").node().parentElement;

// add tooltip to DOM
var tooltip = circleSetVis
    .append('div')
    .attr('class', 'tooltipCircle');
tooltip.append('div')
    .attr('class', 'label');
tooltip.append('div')
    .attr('class', 'count');
tooltip.append('div')
    .attr('class', 'percent');
tooltip.append('div')
    .attr('class', 'percent-to-parent');
// **************************************************

// **************** temp circle set *****************
var circleVisTemp = {
    width: 400,
    height: 400
}

var svgCircleTemp = d3.select('#Visualisations')
  .append("div")
    .attr('id', 'cirlceSetVisTemp')
    .attr("width", circleVisTemp.width)
    .attr("height", circleVisTemp.height)
  .append("svg:svg")
    .attr("width", circleVisTemp.width)
    .attr("height", circleVisTemp.height)
  .append("svg:g")
    .attr("transform", "translate(" + circleVisTemp.width / 2 + "," + (circleVisTemp.height / 2) + ")");

var radiusTemp = Math.min(circleVisTemp.width, circleVisTemp.height) / 2;

var partitionTemp = d3.layout.partition()
    .size([2 * Math.PI, radiusTemp])
    .value(function(d) { return d.size; });

var circleSetVisTemp = d3.select('#cirlceSetVisTemp');

    // add tooltip to DOM
var tooltipTemp = circleSetVisTemp
    .append('div')
    .attr('class', 'tooltipCircleTemp');
tooltipTemp.append('div')
    .attr('class', 'label');
tooltipTemp.append('div')
    .attr('class', 'count');
tooltipTemp.append('div')
    .attr('class', 'percent');
tooltipTemp.append('div')
    .attr('class', 'percent-to-parent');

// **************************************************
var overlyingVis = false;
var overlyingVisParentNames = [];
var currentPartition = partition;
var currentSVGElement = svgCircle;
var currentTooltip = tooltip;
var currentRadius = radius;



// ****************** Parallel Set ******************
var parallelSetVis = {
    width: 700,
    height: 500
}

var dimNames = ["EU country", "foreign country", "sex", "age"];

var parallelSet = d3.parsets(highlightHelperCircle, highlightHelperParallel, dragHelperCircle, dragHelperParallel)
    .dimensions(dimNames)
    .width(parallelSetVis.width)
    .height(parallelSetVis.height)
    .duration(duration);

var svgParallel = d3.select('#Visualisations')
  .append("div")
    .attr('id', 'parallelSetVis')
  .append("svg")
    //.attr('x', circleSetVis.width)
    .attr("width", parallelSet.width())
    .attr("height", parallelSet.height());

var parallelSetVis = d3.select('#parallelSetVis');
// **************************************************


// **************** highlight synchro ***************
function watch(obj, prop, handler) { // make this a framework/global function
    var currval = obj[prop];
    function callback() {
        if (obj[prop] != currval) {
            var temp = currval;
            currval = obj[prop];
            handler(temp, currval);
        }
    }
    return callback;
}

function getPath(d){
    var p = d;
    var pathD = [];

    while (p.depth > 0){
        pathD.unshift(p.name)
        p = p.parent;
    }

    return pathD.join("");
}

var highlightHandler = function (oldval, newval) {
    unhighlight(true);
    //console.log(highlightHelperCircle);
    if(highlightHelperCircle['name'] == "") return;
    
    var selectedPath = circleSetVis.selectAll("[name="+ highlightHelperCircle.name + "]")//.selectAll("[parentName="+ highlightHelperCircle.parent + "]");

    if(selectedPath.length > 0){
        for (i in selectedPath[0]) {
            var slice = selectedPath[0][i].parentNode.__data__;
            if (slice) {
                if(getPath(slice) == highlightHelperCircle.path){
                    if(highlightHelperCircle.parents){
                        highlight(slice, false, true, false, true);
                    } else {
                        highlight(slice, false, false, true, true);                        
                    }
                }
            }
        }
    } else {
        unhighlight(true);
    }
};

var dragHandler = function (oldval, newval) {
    //console.log(dragHelperCircle);
    
    if (dragHelperCircle.drag === "start"){
        dragStart(undefined, dragHelperCircle.y, dragHelperCircle.depth+1, true)

    } else if (dragHelperCircle.drag === "move"){
        dragMove(undefined, dragHelperCircle.y, dragHelperCircle.depth+1, true)

    } else if (dragHelperCircle.drag === "end"){
        dragEnd(undefined, dragHelperCircle.y, dragHelperCircle.depth+1, true)

    }
}


var intervalH1 = setInterval(watch(highlightHelperCircle, "path", highlightHandler), 100);
var intervalH2 = setInterval(watch(highlightHelperCircle, "parents", highlightHandler), 100);
var intervalD1 = setInterval(watch(dragHelperCircle, "x", dragHandler), 10);
var intervalD2 = setInterval(watch(dragHelperCircle, "y", dragHandler), 10);
var intervalD3 = setInterval(watch(dragHelperCircle, "drag", dragHandler), 10);
// **************************************************


// ****************** Load Data ********************
var data;
var overlyingData = data;

var tempCSV;
// load and process data
d3.json("refugee.json", function(error, root) {
    if (error) throw error;
    partition(root);

    // draw circle
    data = root;
    draw(root)

    // copy data:
    var tempData = JSON.parse(JSON.stringify(root, replacer));
    tempCSV = convertJSONtoCSV(tempData);

    // draw set
    svgParallel.datum(tempCSV).call(parallelSet);
});


// **************************************************


function draw(data, ringDepth, currentTransition, transitionOverlyingCirlce)
{  
    // max depth 10
    var counter = [0,0,0,0,0,0,0,0,0,0];
    currentPartition.nodes(data).forEach(function(d,i) {
        d.colorID = counter[d.depth];
        d.id = i;
        ++counter[d.depth];
    });


    // remove all
    var toRemove = currentSVGElement.selectAll("g")
        .remove();

    // ********************     pie slices      ************************************** //
    var dataGroup = currentSVGElement.selectAll("g")
        .data(currentPartition(data)/*, function(d, i) { return i; }*/);
    
    var newGroupes = dataGroup.enter()
        .append("svg:g")
        .attr('scale', 1)
        .attr('class', function(d) { return "group"; });

    var newSlice = newGroupes.append("svg:path")
        .attr('class', 'slice')
        .attr('depth', function(d) { return "slice"+d.depth; })
        .attr("id", function(d, i) { return "slice-" + i; })
        .attr("name", function(d) { return d.name; })
        .attr("parentName", function(d) { return (d.parent) ? d.parent.name : "" ; })
        .attr("d", arc)
        .style("fill", function(d, i) { 
            if(i==0) return "white";
            else return fill(d); 
        })
        .attr("fill-rule", "evenodd")
        //.attr('display', function(d, i) {if(i==0) return "none";})
        .call(drag)
        .on('mouseenter', mouseenter)
        .on('mousemove', mousemove)
        .on('mouseleave', mouseleave); 

    // transition
    if(typeof ringDepth !== "undefined" && typeof currentTransition !== "undefined"){
        // move to front...
        groupSelection = currentSVGElement.selectAll('.group')
            .each(function(d) {
                var parentG = d3.select(this)
                var path = parentG.select('path');
                var depthName = path.attr('depth');
                depthName = depthName.split('slice');
                if(ringDepth == depthName[1]){
                    // move group to front
                    parentG.moveToFront();
                }
        })

        // save old pos
        var startRadius
        currentSVGElement.select("[depth=slice"+(ringDepth)+"]").each(function(d) {startRadius = d.y;});
        
        // reset to last pos of drag end
        var ring = currentSVGElement.selectAll("[depth=slice"+(ringDepth)+"]")
            .attr('d', function(d) {
                d.y = currentTransition;
                return arc(d);
            });

        // transition to old pos
        ring.transition().duration(350)
            .attr('d', function(d) {
                d.y = startRadius;
                return arc(d);
            });
    }

    if(transitionOverlyingCirlce){
        currentSVGElement
            .attr('transform', "translate(" + circleVisTemp.width / 2 + "," + (circleVisTemp.height / 2) + ")scale(.2)")

        currentSVGElement.transition().duration(350)
            .attr('transform', "translate(" + circleVisTemp.width / 2 + "," + (circleVisTemp.height / 2) + ")scale(1)")
    }


    dataGroup.exit()
        .remove();
    // ***************************************************************************** //

    // **************************     label            ***************************** //
    dataGroup.selectAll('.label')
        .attr("transform", function(d, i) { 
            var angle = (d.x + d.dx / 2 - Math.PI / 2) / Math.PI * 180 ;
            return "translate(" + arc.centroid(d) + ")rotate(" + (angle > 90 ? -180 : 0) + ")rotate(" + angle + ")";
        });

    var newLabel = newGroupes.append("svg:text")
        .attr('class', function(d, i) {
            if (i == 0) return "title";
            else return "label";
        })
        .attr('depth', function(d) { return "label"+d.depth; })
        .attr("id", function(d, i) { return "label-" + i; })
        .attr("display", function(d, i) { if (d.value ==  0) return "none";})
        .attr("pointer-events", "none")
        .attr("transform", function(d, i) { 
            var angle = (d.x + d.dx / 2 - Math.PI / 2) / Math.PI * 180 ;
            if (i != 0) { return "translate(" + arc.centroid(d) + ")rotate(" + (angle > 90 ? -180 : 0) + ")rotate(" + angle + ")";
        }})
        .text(function(d, i) { 
            if(!overlyingVis)return d.name;
            else if (i != 0) return d.name;
        });

    var rootLabel = currentSVGElement.select("text.title");

    if (overlyingVis){
        var diff = overlyingVisParentNames.length/2.0 - 0.5;
        overlyingVisParentNames.forEach(function (name, index) {
            rootLabel.append("tspan")
                .attr("x", 0)
                .attr('y', (diff-index)+"em")
                .text(function(d, i) { if (i==0) return overlyingVisParentNames[index]; })
              .append("tspan")
                .attr('class', "childArrows")
                .attr('padding-top', "100px")
                .attr("x", 0)
                .attr('y', (((diff-index)*21)-10)+"px")
                .text(function(d, i) { if (index < overlyingVisParentNames.length-1) return "▾";});
        })
        // for root node 
        rootLabel.append("tspan")
        .attr("x", 0)
        .attr("dy", (overlyingVisParentNames.length)+"em")
        .text(function(d, i) { return d.value; });
    } else {
        // for root node 
        rootLabel.append("tspan")
            .attr("x", 0)
            .attr("dy", "1em")
            .text(function(d, i) { return d.value; });
    }

    // ***************************************************************************** //
}

// ################################ mouse events############################### //
function mouseenter(d){
    // get total size
    var totalSize = data.value;

    highlight(d, false, true);

    var parentSize = (typeof d.parent == "undefined") ? d.value : d.parent.value ;

    var percent = Math.round(1000.0 * d.value / totalSize) / 10.0;
    var parentPercent = Math.round(1000.0 * d.value / parentSize) / 10.0;

    var p = d;
    var path = [];
    while (p.depth > 0){
        path.unshift(p.name)
        p = p.parent;
    }
     
    // *********************    tooltip / infobox   ******************************** //
    currentTooltip.select('.label').html('<b>' + path.join(" → ") + '</b>' );
    currentTooltip.select('.count').html('count: ' + d.value + " ("+percent+"%)"); 
    //currentTooltip.select('.percent').html('total percent: ' + percent + '%'); 
    currentTooltip.select('.percent-to-parent').html('to parent: ' + parentPercent + '%'); 
    currentTooltip.style('display', 'inline-block');
}

function mousemove(d){
    if (dragging)  {
        currentTooltip.style('display', 'none');
        return
    }

    if (overlyingVis){
        var offset = circleSetVisTemp[0][0].getBoundingClientRect()
        currentTooltip
            .style('left', (d3.mouse(mouseSVG)[0]-offset.left + 10) + 'px')
            .style('top', (d3.mouse(mouseSVG)[1]-offset.top + 10) + 'px');

    } else {
        currentTooltip
            .style('left', (d3.mouse(mouseSVG)[0] + 10) + 'px')
            .style('top', (d3.mouse(mouseSVG)[1] + 10) + 'px');
    }

}

function mouseleave(d){
    if (dragging) return;
    unhighlight();
    currentTooltip.style('display', 'none');

    highlightHelperCircle['name']=d.name;
}

function resetVis() {
    currentSVGElement = svgCircle;
    currentPartition = partition;
    currentTooltip = tooltip;
    currentRadius = radius;
    circleSetVisTemp
        .attr('pointer-events', "none")
        .style('display', 'none');

    circleSetVis
        .attr('pointer-events', "")
        .style('opacity', "1.0");

    overlyingVis = false;
    overlyingVisParentNames = []
    draw(data);
}

function setOverlyingVis() {
    currentSVGElement = svgCircleTemp;
    currentPartition = partitionTemp;
    currentTooltip = tooltipTemp;
    currentRadius = radiusTemp;

    svgCircle.selectAll("path")
        .attr("class", "slice-inactiv")
        .style("fill", "grey")

    tooltip.style('display', "none")
    
    
    circleSetVis
        .attr('pointer-events', "none")
        .style('opacity', "0.1");

    circleSetVisTemp
        .attr('pointer-events', "")
        .style('display', 'block')
        .style('opacity', "1.0")
        .style('left', (d3.mouse(mouseSVG)[0]-radiusTemp) + 'px')
        .style('top', (d3.mouse(mouseSVG)[1]-radiusTemp) + 'px');

    overlyingVis = true;
    draw(overlyingData, 0, 0, true);
}

function mouseclick(d){
    if(typeof(d) === "undefined"){
        if(overlyingVis) {
           resetVis();
        }
    } else {
        if (!overlyingVis){
            if(!d.children) return;

            var dCopy = JSON.parse(JSON.stringify(d, replacer));
            overlyingData = dCopy;

            // get parent names...
            var p = d;
            overlyingVisParentNames = [];
            while (p){
                overlyingVisParentNames.unshift(p.name)
                p = p.parent;
            }
            overlyingVisParentNames.reverse()

            setOverlyingVis();
        } else {
            resetVis();
        }
    }
}




// ******************************* drag event ****************************** //
var depthSelection = 0;
var skipNextScale = false;

var dragIndex = 0;

var mouseStartY = -1;
var startRadius = 0;

var mouseDX = 0;
var mouseDY = 0;
var transformedMousePos = 0;

// transition
var currentTransition = 0;
var changedDepth = 0;
var changedScale = 0;

cirlceScale = d3.scale.linear().domain([0,196]).range([0,80]);

var groupSelection, sliceSelection, labelSelection;
drag.on("dragstart", dragStart)
    .on("drag", dragMove)
    .on("dragend", dragEnd);

function dragStart(d, simulatedY, depth, syncmode) {
    dragging = true;
    changedDepth = 0;
    changedScale = 0;
    transformedMousePos = 0;
    dragIndex = 0;

    if(syncmode){
        depthSelection = depth;
        currentSVGElement.select("[depth=slice"+(depthSelection)+"]").each(function(d) {startRadius = d.y;});
        currentTransition = startRadius;
    } else {
        currentTransition = d.y;
        depthSelection = d.depth;

        if(!overlyingVis){
            dragHelperParallel['x']=d3.mouse(mouseSVG)[0];
            dragHelperParallel['y']=d3.mouse(mouseSVG)[1];
            dragHelperParallel['depth']=depthSelection-1;
            dragHelperParallel['drag']="start";
        }
    }

    //console.log("d: " + d + "  simulatedY:  " + simulatedY + "  depthSelection: " + depthSelection + " syncmode: " + syncmode );

    // move to front...
    groupSelection = currentSVGElement.selectAll('.group')
        .each(function(d) {
            var parentG = d3.select(this)
            var path = parentG.select('path');
            var depthName = path.attr('depth');
            depthName = depthName.split('slice');
            if(depthSelection == depthName[1]){
                // move group to front
                parentG.moveToFront();
            }
    })

    sliceSelection = currentSVGElement.selectAll("[depth=slice"+depthSelection+"]");
    labelSelection = currentSVGElement.selectAll("[depth=label"+depthSelection+"]");
}

function dragMove(d, simulatedY, depth, syncmode) {

    //console.log("d: " + d + "  simulatedY:  " + simulatedY + "  depthSelection: " + depthSelection + " syncmode: " + syncmode );
    var transformed = false;

    // cant do it on drag start.. because it is still undefined there.. ?!
    if (mouseStartY === -1){
        mouseStartY = simulatedY;
    }

    if(!syncmode){
        mouseDX = d3.event.dx;
        mouseDY = d3.event.dy;
    } else {
        // in syncmode there exist only y direction.
        mouseDX = 0;
        mouseDY = mouseStartY - simulatedY - transformedMousePos;
    }

    // set transition paramter
    changedDepth = depthSelection;
        
    // get mouse direction length ( plus ) 
    var transitionDistance = 1;

    if(syncmode){
        transitionDistance = (startRadius - cirlceScale(mouseDY));


    } else {
        // avoid weird mouse bug after transformation...
        if (!skipNextScale){
           transitionDistance = length(mouseDX, mouseDY);
        }
        skipNextScale = false;

        // mouse input direction (normalized)
        var mouseDirection = [mouseDX/transitionDistance, mouseDY/transitionDistance];

        // determine normalized direction vec
        var localDirection = arc.centroid(d)
        var l = length(localDirection[0], localDirection[1])
        localDirection = [localDirection[0]/l, localDirection[1]/l];

        // compute angle between local and mouse direction --> [if 0 --> decrease scale, if 180 --> decrease scale]
        var angle = rad2deg(Math.acos(mouseDirection[0]*localDirection[0] + mouseDirection[1]*localDirection[1]))

        //console.log('angle'+angle);
        // get direction of scala factor
        if (angle >= 90){
            transitionDistance = -transitionDistance;
        }

        //transitionDistance = (current) d.y + transitionDistance;
        currentSVGElement.select("[depth=slice"+(depthSelection)+"]").each(function(d) {transitionDistance += d.y;});
    }
    
    // get innderradius (d.y) from prev and next layer
    var prevInnerR = 0, 
        nextInnerR = currentRadius, 
        innerRing = 0;

    currentSVGElement.select("[depth=slice"+(depthSelection-1)+"]").each(function(d) {prevInnerR = d.y;});
    currentSVGElement.select("[depth=slice"+(depthSelection+1)+"]").each(function(d) {nextInnerR = d.y;});

    var min = currentRadius/10;
    var max = currentRadius - min;

    // transform slices and labels
    if (sliceSelection.length > 0 && labelSelection.length > 0){
        sliceSelection
            .attr('d',  function(d,i){
                if (transitionDistance > min && transitionDistance < max){
                    d.y = transitionDistance
                    currentTransition = transitionDistance;
                }

                if (d.y <= prevInnerR && d.y > 0 && !transformed) {
                    changedScale = prevInnerR;
                    innerRing = depthSelection-1;
                    --depthSelection;
                    transformed = true;
                } else if (d.y >= nextInnerR && d.y > 0 && !transformed) {
                    changedScale = nextInnerR;
                    innerRing = depthSelection;
                    ++depthSelection;
                    transformed = true;
                }

                return arc(d);
            });

        labelSelection
            .attr("transform", function(d, i) { 
                var angle = (d.x + d.dx / 2 - Math.PI / 2) / Math.PI * 180 ;
                return "translate(" + arc.centroid(d) + ")rotate(" + (angle > 90 ? -180 : 0) + ")rotate(" + angle + ")";
            });
    }

    if (!syncmode && !overlyingVis){
        dragHelperParallel['x']=0;
        dragHelperParallel['y']=transitionDistance;
        dragHelperParallel['depth']=depthSelection-1;
        dragHelperParallel['drag']="move";
    }
        
    if (transformed){
        // draw data

        if(overlyingVis){
            overlyingData = transformTree(overlyingData, innerRing);
            draw(overlyingData, changedDepth, changedScale);
        } else {
            data = transformTree(data, innerRing);
            draw(data, changedDepth, changedScale);
        }



        transformedMousePos += mouseDY;

        // get new start y position.. for drag helper
        currentSVGElement.select("[depth=slice"+(depthSelection)+"]").each(function(d) {startRadius = d.y;});
        
        // move to front...
        groupSelection = currentSVGElement.selectAll('.group')
            .each(function(d) {
                var parentG = d3.select(this)
                var path = parentG.select('path');
                var depthName = path.attr('depth');
                depthName = depthName.split('slice');
                if(depthSelection == depthName[1]){
                    // move group to front
                    parentG.moveToFront();
                }
            })

        sliceSelection = currentSVGElement.selectAll("[depth=slice"+depthSelection+"]");
        labelSelection = currentSVGElement.selectAll("[depth=label"+depthSelection+"]");

        skipNextScale = true;
    }
    ++dragIndex;
}

function dragEnd(d, simulatedY, depth, syncmode) {
    if(!syncmode && !overlyingVis){
        dragHelperParallel['x']=0;
        dragHelperParallel['y']=0;
        dragHelperParallel['depth']=0;
        dragHelperParallel['drag']="end";
    }
    if(dragIndex > 0){
        if(overlyingVis){
            draw(overlyingData, depthSelection, currentTransition); 
        } else {
            draw(data, depthSelection, currentTransition); 
        }


    } else if(!syncmode){
        mouseclick(d);
    }

    mouseStartY = -1;

    transformedMousePos = 0;
    dragging = false;

}
// ***************************************************************************** //
// ############################################################################# //

function highlight(d, ancestor, parents, childs, syncmode){
    var p = d;
    var path = [];
    while (p.depth > 0){
        path.unshift(p.name)
        p = p.parent;
    }
    //console.log('highlight');

    if(!syncmode && !overlyingVis){
        highlightHelperParallel['name'] = d.name;
        highlightHelperParallel['path'] = path.join("");
        highlightHelperParallel['parents'] = true;
    }

        
    if (ancestor){
        var ring = currentSVGElement.selectAll("[depth=slice"+d.depth+"]")
            .attr('class', "slice-active");
    }

    if (childs) {
        currentSVGElement.selectAll("[name="+d.name+"]")
            .attr('class', "slice-active-p")
            .forEach(function(d) { 
                if(d){
                    for (i in d) {
                        highlightChilds(d[i].__data__);
                    }
                }
            })
    }


    if(parents){
        highlightChilds(d)
        var parent = d;
        while(parent.depth > 0) {       
            currentSVGElement.select("[id=slice-"+(parent.id)+"]")
                .attr('class', "slice-active-p");

            parent=parent.parent
        }
    }
}

function highlightChilds(d){
    if(d && d.children){    
        for (i in d.children){
            var currentNode = d.children[i];
            currentSVGElement.select("[id=slice-"+(currentNode.id)+"]").attr('class', "slice-active-p");
            highlightChilds(currentNode);
        }
    }
}

function unhighlight(syncmode){
    currentSVGElement.selectAll('.slice-active')
        .attr('class', 'slice');

    currentSVGElement.selectAll('.slice-active-p')
        .attr('class', 'slice');
    //if(!syncmode){
        highlightHelperParallel['name'] = "";
        highlightHelperParallel['path'] = "";
        highlightHelperParallel['parents'] = true;
    //}
}


function fill(d) {
  var p = d;
  while (p.depth > 1) p = p.parent;
  var c = d3.hsl(hue(p.colorID));
  c.s = saturation(d.depth);
  c.l = lightness(d.value);

  return c;
}

















function getTree(d) {

}


function transformTree(d, innerRing){

    //console.log('transform tree');
    var depth1 = innerRing;

    var root = d;
    while (root.parent) root = root.parent;

    var data = root;

    // get all parent nodes (tree's) from depth1
    var inputTrees = getNodes(data, depth1-1);
    //console.log(JSON.parse(JSON.stringify(inputTrees, replacer)));
 
   if (inputTrees.length < 1 || !inputTrees[0].children) return data;

    // process each under tree
    var underTrees = []
    for (i in inputTrees){
        underTrees[i] = processTree(inputTrees[i]);
    }

    if (depth1 > 2) {
        for (i in underTrees){
            var underTree = underTrees[i];
            // find root:
            for (x in data.children){
                var currentNode = data.children[x];
                if(currentNode.name == underTree.parent){
                    for (y in currentNode.children){
                        var currentChild = currentNode.children[y];
                        if (currentChild.name == underTree.name){
                            currentNode.children[y] = underTree;
                        }
                    }
                }
            }
        }
    }else {
        if(underTrees.length > 1){
            data['children'] = underTrees;
        } else if (underTrees.length === 1) {
            data = underTrees[0];
        }
    }
    
    //console.log("transformed tree");
    //console.log(JSON.parse(JSON.stringify(data, replacer)));
    
    return data;
}


function replacer(key, value) {
    if( key === "parent" || key === "dx" || key === "x" ||key === "y" || key === "dy" || key === "shortName") {
        return undefined;
    }
    return value;
}

function processTree(d){

        /***********************************  old structure  ******************************** 
    /*
    /*                                          root
    /*                              -----------/    \--------
    /*                    oldChild1                          oldChild2
    /*                   |         |                        |         |
    /*          newChild1           newChild2       newChild1         newChild2
    /*          |       |           |       |       |       |         |       |
    /*          c1     c2           c3     c4       c5     c6         c7     c8
    /*
    *************************************************************************************/

    /***********************************  new structure  ******************************** 
    /*
    /*                                          root
    /*                              -----------/    \--------
    /*                    newChild1                          newChild2
    /*                   |         |                        |         |
    /*          oldChild1           oldChild2       oldChild1         oldChild2
    /*          |       |           |       |       |       |         |       |
    /*          c1     c2           c3     c4       c5     c6         c7     c8
    /*
    *************************************************************************************/
    
    // clone tree data
    var tree = JSON.parse(JSON.stringify(d, replacer));
    if(d.parent){
        tree['parent']=d.parent.name;        
    }

    //console.log("***************** input tree: " + tree.name + "************************");
    //console.log(JSON.parse(JSON.stringify(tree, replacer)));

    // get new childrens
    var newChilds = [];
    for (i in tree.children[0].children){
        newChilds.push(tree.children[0].children[i]);
    }

    // define "under tree" for each new child  
    var underTreeObjects = []
    for (t in newChilds){
        var underTreeObject = newChilds[t];
        //console.log("******************  underTreeObject:  "+underTreeObject.name+ " ****************");
        //console.log(JSON.parse(JSON.stringify(underTreeObject, replacer)));      
        
        // use original tree because stree structure is allready incomplete...
        var oldTree = JSON.parse(JSON.stringify(d, replacer));
        if(d.parent){
            oldTree['parent']=d.parent.name;
        }

        // get old childs 
        var oldChilds = [];
        for (i in oldTree.children){
            oldChilds.push(oldTree.children[i]);
        }

        // find right child for each old child
        var childIndex = 0;
        var childObjects = []
        var childChildObjects = [];
        for (oc in oldChilds){
            var childObject = oldChilds[oc];
            //console.log("******************  childObject:  "+childObject.name+ " ****************");
            //console.log(JSON.parse(JSON.stringify(childObject, replacer)));

            // find corresponding child child
            for (cc in childObject.children){
                var childChildObject = childObject.children[cc];
                //console.log("******************  childChildObject:  "+childChildObject.name+ " ****************");
                //console.log(JSON.parse(JSON.stringify(childChildObject, replacer)));

                if (underTreeObject.name === childChildObject.name){    
                    //console.log(underTreeObject.name + " === " + childChildObject.name);
                    if(childChildObject.children){
                        childObject['children'] = childChildObject.children;
                    } else {
                        // leaf node.. transfer 'size' value
                        childObject['size'] = childChildObject['size'];
                        delete childChildObject['size'];
                        delete underTreeObject['size'];
                        delete childObject['value'];
                        delete childObject['children'];
                    }

                    childObjects.push(childObject);
                    break;
                }
            }
            //console.log("******************************************************************");
        }

        underTreeObject['children'] = childObjects;        
        underTreeObjects.push(underTreeObject);

        //console.log("******************  final underTreeObject:  "+underTreeObject.name+ " ****************");
        //console.log(JSON.parse(JSON.stringify(underTreeObject, replacer)));
        //console.log("##############################################################");
    }

    tree['children'] = underTreeObjects;

    return tree;
}

function getNodes(root, depth){
    var nodes = [];
    if (depth === 0) {
        nodes.push(root);
        return nodes;
    }

    if (root.depth === depth -1 && root.children){
        nodes = root.children;
    } else {
        for (i in root.children){
            nodes = nodes.concat(getNodes(root.children[i], depth));
        }
    }
    return nodes;
}

function resetData(root) {
    var sum = 0;
    currentPartition.nodes(root)
        .forEach(function(d) {
            d.value = 0;
            d.depth = 0;
            delete d['value'];
            delete d['depth'];
            if (!d.children) {
                //console.dir(d.parent.parent.parent.name + " --> " + d.parent.parent.name + " --> " + d.parent.name + " --> " + d.name +  "  size: " + d.size)
                sum+=d.size;
            };
        });
    currentPartition(root);
}





function pruneDepth(root, depth) {
    var removed = false;
    for (i in root.children){
        var currentNode = root.children[i];
        //console.dir("check: " + currentNode.name + " (depth: " + currentNode.depth + ")");

        if (currentNode.depth >= depth) {
            // "delete" current Node 
            //console.dir("delete: " + i + " child of " + currentNode.parent.name + " (depth: " + currentNode.parent.depth + ") --> " + currentNode.parent.children[i].name + " (depth: " + currentNode.parent.children[i].depth + ")");
            
            var temp = currentNode;
            //currentNode.parent.size  = countSize(temp.parent);

            currentNode.parent.children[i] = [];
            removed = true;

            continue;
        }
        pruneDepth(currentNode, depth);
    }
    if (removed) return true;
    else return false;
}

function pruneName(root, name) {
    var removed = false;
    for (i in root.children){
        var currentNode = root.children[i];
        if (currentNode.name === name) {
            removed = true;
            currentNode.parent.children[i] = [];
        }
        pruneName(currentNode, name);
    }
    if (removed) return true;
    else return false;
}


function length(x, y){
    return Math.sqrt(x*x + y*y);
}

function rad2deg(angle) {
    // (angle / 180) * Math.PI;
    return angle * (180 /  Math.PI);
}


function convertJSONtoCSV(json) {
    var csv = [];

    currentPartition.nodes(json)
        .forEach(function(d) {
            if (d.size) {
                for (var i = 0; i < d.size; i++) {
                    var obj= new Object;
                    obj[dimNames[0]] = d.parent.parent.parent.name;
                    obj[dimNames[1]] = d.parent.parent.name;
                    obj[dimNames[2]] = d.parent.name;
                    obj[dimNames[3]] = d.name;
                    csv.push(obj);
                };
            };
        });
    return csv;
}