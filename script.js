d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

// visualisation settings
var vis = {
    width: 800,
    height: 800
}

//var color = d3.scale.category20c();
var hue = d3.scale.ordinal()
  .domain([1,0,2,3,4,5,6,7,8,9])
  .range(["#1f77b4", "#ff7f0e", "#2ca02c", 
          "#d62728" , "#9467bd", "#8c564b", 
          "#e377c2" , "#7f7f7f", "#bcbd22", "#17becf"]);

//var hue = d3.scale.category10();
var saturation = d3.scale.linear()
    .domain([1, 4])
    .clamp(true)
    .range([1.0, .7]);
var lightness = d3.scale.linear()
    .domain([0, 7])
    .clamp(true)
    .range([0.7, 0.4]);


var radius = Math.min(vis.width, vis.height) / 2;
var arcLength = d3.scale.linear().range([0, 2 * Math.PI]);
var arcDistance = d3.scale.linear().range([0, radius]);

var duration = 1000;
var padding = 10;
var dragging = false;

// ****************** Circle Set ********************
// visualisation settings
var circleSetVis = {
    width: 600,
    height: 600
}

var radius = Math.min(circleSetVis.width, circleSetVis.height) / 2;
var arcLength = d3.scale.linear().range([0, 2 * Math.PI]);
var arcDistance = d3.scale.linear().range([0, radius]);

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
  .append("div")
    .attr('id', 'cirlceSetVis')
  .append("svg:svg")
    .attr("width", circleSetVis.width)
    .attr("height", circleSetVis.height)
  .append("svg:g")
    .attr("transform", "translate(" + circleSetVis.width / 2 + "," + (circleSetVis.height / 2) + ")");

// add tooltip to DOM
var tooltip = d3.select('#Visualisations')
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

// **************** highlight synchro ***************
var highlightHelperCircle = {name:"", path:"", parents:true};
var highlightHelperParallel = {name:"", path:"", parents:true};

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

var myhandler = function (oldval, newval) {
    unhighlight(true);
    //console.log(highlightHelperCircle);
    if(highlightHelperCircle['name'] == "") return;
    
    var selectedPath = d3.select("#cirlceSetVis").selectAll("[name="+ highlightHelperCircle.name + "]")//.selectAll("[parentName="+ highlightHelperCircle.parent + "]");
    //var selectedPath = d3.selectAll("[name="+ highlightHelperCircle.name + "]")//.selectAll("[parentName="+ highlightHelperCircle.parent + "]");
    //console.log(selectedPath);


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
        console.log('fail');
        unhighlight(true);
    }
    
};

var intervalH = setInterval(watch(highlightHelperCircle, "path", myhandler), 100);
var intervalH2 = setInterval(watch(highlightHelperCircle, "parents", myhandler), 100);
// **************************************************

// ****************** Parallel Set ******************
var parallelSetVis = {
    width: 700,
    height: 500
}

var parallelSet = d3.parsets(highlightHelperCircle, highlightHelperParallel)
    .dimensions(["EUcountry", "asylCountry", "gender", "age"])
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

d3.csv("asyl.csv", function(csv) {
    svgParallel.datum(csv).call(parallelSet);
});
// **************************************************


// ****************** Load Data ********************
var data;
// load and process data
d3.json("asyl.json", function(error, root) {
    if (error) throw error;
    partition(root);
    data = root;
    draw(root)
});

var drag = d3.behavior.drag();

function draw(data)
{  
    console.log('draw');

    // max depth 10
    var counter = [0,0,0,0,0,0,0,0,0,0];
    partition.nodes(data).forEach(function(d,i) {
        d.colorID = counter[d.depth];
        d.id = i;
        ++counter[d.depth];
    });

    // remove all
    var toRemove = svgCircle.selectAll("g")
        .remove();

    // *********************    tooltip / infobox   ******************************** //
    var tooltip = d3.select('.tooltip')

    // ********************     pie slices      ************************************** //
    var dataGroup = svgCircle.selectAll("g")
        .data(partition(data), function(d, i) { return i; });

    dataGroup.selectAll('.slice')
        .attr("d", arc);
    
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
        .style("fill", function(d) { return fill(d); })
        .attr("fill-rule", "evenodd")
        .attr('display', function(d, i) {if(i==0) return "none";})
        .call(drag)
        .on('mouseenter', mouseenter)
        .on('mousemove', mousemove)
        .on('mouseleave', mouseleave);      

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
        .text(function(d) { return d.name; });

    // for root node 
    newLabel.append("tspan")
        .attr("x", 0)
        .attr("dy", "1em")
        .text(function(d, i) { if (i==0) return d.value; });   
    // ***************************************************************************** //
}

function transformTree(d, innerRing){
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









// ################################ mouse events############################### //
function mouseenter(d){
    // get total size
    var totalSize = data.value;

    highlight(d, true, true);

    var parentSize = (typeof d.parent == "undefined") ? d.value : d.parent.value ;

    var percent = Math.round(1000 * d.value / totalSize) / 10;
    var parentPercent = Math.round(1000 * d.value / parentSize) / 10;

    var p = d;
    var path = [];
    while (p.depth > 0){
        path.unshift(p.name)
        p = p.parent;
    }
        
    tooltip.select('.label').html('<b>' + path.join(" → ") + '</b>' );
    tooltip.select('.count').html('count: ' + d.value + (percent)); 
    //tooltip.select('.percent').html('total percent: ' + percent + '%'); 
    tooltip.select('.percent-to-parent').html('percent to parent: ' + parentPercent + '%'); 
    tooltip.style('display', 'block');
}

function mousemove(d){
    if (dragging)  {
        tooltip.style('display', 'none');
        return
    }
    tooltip.style('left', (d3.event.pageX + 2) + 'px')
           .style('top', (d3.event.pageY + 2) + 'px');
}

function mouseleave(d){
    if (dragging) return;
    unhighlight();
    tooltip.style('display', 'none');

    highlightHelperCircle['name']=d.name;
}












// ******************************* drag event ****************************** //
var initDragging = false;
var depthSelection = 0;
var skipNextScale = false;

var groupSelection, sliceSelection, labelSelection;
drag.on("dragstart", dragStart)
    .on("drag", dragMove)
    .on("dragend", dragEnd);

function dragStart(d) {
    //console.log("dragstart");
    dragging = true;
    initDragging = true;
    depthSelection = d.depth;

    // move to front...
    groupSelection = d3.selectAll('.group')
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

    sliceSelection = d3.selectAll("[depth=slice"+depthSelection+"]");
    labelSelection = d3.selectAll("[depth=label"+depthSelection+"]");
}

function dragMove(d) {
    var transformed = false;

    var mouseDX = d3.event.dx;
    var mouseDY = d3.event.dy;
        
    // get mouse direction length ( plus avoid weird mouse bug after transformation...) 
    var scaleFactor = 1;
    if (!skipNextScale){
       scaleFactor = length(mouseDX, mouseDY);
    }
    skipNextScale = false;

    // mouse input direction (normalized)
    var mouseDirection = [mouseDX/scaleFactor, mouseDY/scaleFactor];

    // determine normalized direction vec
    var localDirection = arc.centroid(d)
    var l = length(localDirection[0], localDirection[1])
    localDirection = [localDirection[0]/l, localDirection[1]/l];

    // compute angle between local and mouse direction --> [if 0 --> decrease scale, if 180 --> decrease scale]
    var angle = rad2deg(Math.acos(mouseDirection[0]*localDirection[0] + mouseDirection[1]*localDirection[1]))

    // get direction of scala factor
    if (angle > 90){
        scaleFactor = -scaleFactor;
    } 
    
    // get innderradius (d.y) from prev and next layer
    var prevInnerR = 0, 
        nextInnerR = radius, 
        innerRing = 0;

    d3.select("[depth=slice"+(depthSelection-1)+"]").each(function(d) {prevInnerR = d.y;});
    d3.select("[depth=slice"+(depthSelection+1)+"]").each(function(d) {nextInnerR = d.y;})

    // transform slices and labels
    sliceSelection
        .attr('d',  function(d,i){
            if ((d.y + scaleFactor) > 30 && (d.y + scaleFactor) < radius-30){
                d.y += (scaleFactor);
            }
            if (d.y < prevInnerR && d.y > 0 && !transformed) {
                innerRing = depthSelection-1;
                //console.log("decrease dept  " + d.y + ", " + prevInnerR + "  transformed: " + transformed)
                --depthSelection;
                transformed = true;
            } else if (d.y > nextInnerR && d.y > 0 && !transformed) {
                innerRing = depthSelection;
                //console.log("increase dept  " + d.y + ", " + nextInnerR + "  transformed: " + transformed)
                ++depthSelection;
                transformed = true;
            }

            return arc(d);
        });

    labelSelection
        .attr("transform", function(d, i) { 
            var angle = (d.x + d.dx / 2 - Math.PI / 2) / Math.PI * 180 ;
 
            if ((d.y + scaleFactor) > 60 && (d.y + scaleFactor) < radius-40){
                return "translate(" + [mouseDX,mouseDY] + ")translate(" + arc.centroid(d) + ")rotate(" + (angle > 90 ? -180 : 0) + ")rotate(" + angle + ")";
            } else {
                return "translate(" + arc.centroid(d) + ")rotate(" + (angle > 90 ? -180 : 0) + ")rotate(" + angle + ")";
            }
        });
        
    if (transformed){
        // draw data
        data = transformTree(data, innerRing);
        draw(data);
        
        // move to front...
        groupSelection = d3.selectAll('.group')
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

        sliceSelection = d3.selectAll("[depth=slice"+depthSelection+"]");
        labelSelection = d3.selectAll("[depth=label"+depthSelection+"]");

        skipNextScale = true;
        //console.log("draw data : ");
        //console.log(JSON.parse(JSON.stringify(data, replacer)));
    }
}

function dragEnd(d) {
    //console.log("dragend");

    /*d3.selectAll('path')
        .on('mouseenter', mouseenter)
        .on('mousemove', mousemove)
        .on('mouseleave', mouseleave);*/

    dragging = false;
    draw(data);
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

    if(!syncmode){
        highlightHelperParallel['name'] = d.name;
        highlightHelperParallel['path'] = path.join("");
        highlightHelperParallel['parents'] = true;
    }

        
    if (ancestor){
        var ring = d3.selectAll("[depth=slice"+d.depth+"]")
            .attr('class', "slice-active");
    }

    if (childs) {
        d3.select("#cirlceSetVis").selectAll("[name="+d.name+"]")
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
            d3.select("[id=slice-"+(parent.id)+"]")
                .attr('class', "slice-active-p");

            parent=parent.parent
        }
    }
}

function highlightChilds(d){
    if(d && d.children){    
        for (i in d.children){
            var currentNode = d.children[i];
            d3.select("[id=slice-"+(currentNode.id)+"]").attr('class', "slice-active-p");
            highlightChilds(currentNode);
        }
    }
}

function unhighlight(syncmode){
    d3.selectAll('.slice-active')
        .attr('class', 'slice');

    d3.selectAll('.slice-active-p')
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
    partition.nodes(root)
        .forEach(function(d) {
            d.value = 0;
            d.depth = 0;
            delete d['value'];
            delete d['depth'];
            if (!d.children) {
                console.dir(d.parent.parent.parent.name + " --> " + d.parent.parent.name + " --> " + d.parent.name + " --> " + d.name +  "  size: " + d.size)
                sum+=d.size;
            };
        });
    partition(root);
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

