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
var hue = d3.scale.category10();
var luminance = d3.scale.sqrt()
    .domain([6, -3])
    .clamp(true)
    .range([50, 90]);

var radius = Math.min(vis.width, vis.height) / 2;
var arcLength = d3.scale.linear().range([0, 2 * Math.PI]);
var arcDistance = d3.scale.linear().range([0, radius]);

var duration = 1000;
var padding = 10;
var dragging = false;

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
var svg = d3.select('#chart')
  .append("svg:svg")
    .attr("width", vis.width)
    .attr("height", vis.height)
  .append("svg:g")
    .attr("transform", "translate(" + vis.width / 2 + "," + (vis.height / 2) + ")");

// add tooltip to DOM
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

var data;

// load and process data
d3.json("asyl.json", function(error, root) {
    if (error) throw error;
    partition(root);
    data = root;
    //transformTree(root);

    draw(root)
});

function length(x, y){
    return Math.sqrt(x*x + y*y);
}

function rad2deg(angle) {
    // (angle / 180) * Math.PI;
    return angle * (180 /  Math.PI);
}


var initDragging = false;
var depthSelection = 0;
var skipNextScale = false;
// ******************************* drag event ****************************** //
var drag = d3.behavior.drag()
    .on("dragstart", function(d,i) {
        //console.log("dragstart");
        dragging = true;
        initDragging = true;

        d3.event.sourceEvent.stopPropagation(); 
    })
    .on("drag", function(d,i) {
        //console.log("drag");
        var transformed = false;
        
        if(initDragging){
            depthSelection = d.depth;
            initDragging = false;
        }

        // get mouse direction length ( plus avoid weird mouse bug after transformation...) 
        var scaleFactor = 1;
        if (!skipNextScale){
           scaleFactor = length(d3.event.dx, d3.event.dy);
        }
        skipNextScale = false;

        // mouse input direction (normalized)
        var mouseDirection = [d3.event.dx/scaleFactor, d3.event.dy/scaleFactor];

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
        
        // move to front...
        var group = d3.selectAll('.group')
            .each(function(d) {
                var parentG = d3.select(this)
                var path = parentG.select('path');
                if(depthSelection == path.attr('depth')){
                    // move group to front
                    parentG.moveToFront();
                }
        })

        // get innderradius (d.y) from prev and next layer
        var prevInnerR = 0, 
            nextInnerR = radius, 
            innerRing = 0;

        d3.select('.slice-' + (depthSelection-1)).each(function(d) {prevInnerR =  d.y;});
        d3.select('.slice-' + (depthSelection+1)).each(function(d) {nextInnerR = d.y;})

        // transform slices and labels
        //console.log("selection depth: "+ depthSelection + "   prevRing:  " +prevInnerR + "   innerRadius: " + d.y + "    nextRing:  " + nextInnerR); 
        //console.log("scale factor " + scaleFactor);

        d3.selectAll('.slice-' + depthSelection)
            .attr('d',  function(d,i){
                d.y += (scaleFactor);

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

        d3.selectAll('.label-'+depthSelection)
            .attr("transform", function(d, i) { 
                var angle = (d.x + d.dx / 2 - Math.PI / 2) / Math.PI * 180 ;
                var x = d3.event.dx;
                var y = d3.event.dy;
                return "translate(" + [x,y] + ")translate(" + arc.centroid(d) + ")rotate(" + (angle > 90 ? -180 : 0) + ")rotate(" + angle + ")";
            });

        if (transformed){
            //console.log("transform:  inner Ring: " + innerRing);
            data = transformTree(data, innerRing);
            skipNextScale = true;
            //console.log("draw data : ");
            //console.log(JSON.parse(JSON.stringify(data, replacer)));
            draw(data);
        }
    })
    .on("dragend", function(d,i) {
        //console.log("dragend");
        dragging = false;
        draw(data);
    });
// ***************************************************************************** //

function draw(data)
{
    partition(data);

    // remove all
    var toRemove = svg.selectAll("g")
        .remove();

    // *********************    tooltip / infobox   ******************************** //
    var tooltip = d3.select('.tooltip')

    // ********************     pie slices      ************************************** //
    var dataGroup = svg.selectAll("g")
        .data(partition(data), function(d, i) { return i; });

    dataGroup.selectAll('path')
        .attr("d", arc);
    
    var newGroupes = dataGroup.enter()
        .append("svg:g")
        .attr('scale', 1)
        .attr('class', function(d) { return "group"; });

    var newSlice = newGroupes.append("svg:path")
        .attr('class', function(d) { return "slice-" + d.depth; })
        .attr('depth', function(d) { return d.depth; })
        .attr("id", function(d, i) { return "path-" + i; })
        .attr("d", arc)
        .style("fill", function(d) { return fill(d); })
        .attr("fill-rule", "evenodd")
        .attr('display', function(d, i) {if(i==0) return "none";})
        .call(drag);
    
/*    newSlice.on('click', function(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        transformTree(d);
    });*/

    // get total size
    var totalSize = data.value;

    newSlice.on('mouseenter', function(d) {
        if (dragging) return;
        highlight(d);

        var parentSize = (typeof d.parent == "undefined") ? d.value : d.parent.value ;

        var percent = Math.round(1000 * d.value / totalSize) / 10;
        var parentPercent = Math.round(1000 * d.value / parentSize) / 10;
        tooltip.select('.label').html('<b>' + d.name + '</b>' );
        tooltip.select('.count').html('count: ' + d.value); 
        tooltip.select('.percent').html('total percent: ' + percent + '%'); 
        tooltip.select('.percent-to-parent').html('percent to parent: ' + parentPercent + '%'); 
        tooltip.style('display', 'block');
    });

    newSlice.on('mousemove', function(d) {
        tooltip.style('left', (d3.event.pageX + 2) + 'px')
               .style('top', (d3.event.pageY + 2) + 'px');
    });

    newSlice.on('mouseleave', function(d) {
        unhighlight(d);
        tooltip.style('display', 'none');
    });


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
            else return "label-" + d.depth;
        })
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


function highlight(d){
    var ring = d3.selectAll('.slice-'+d.depth)
        .attr('class', "path-active");
}


function unhighlight(d){
    var ring = d3.selectAll('.path-active')
        .attr('class', function(d) { return "slice-" + d.depth; });
}


function fill(d) {
  var p = d;
  while (p.depth > 1) p = p.parent;
  var c = d3.lab(hue(p.name));
  c.l = luminance(d.value - d.depth);
  return c;
}

function replacer(key, value) {
    if( key === "parent" || key === "dx" || key === "x" ||key === "y" || key === "dy" || key === "depth" || key === "shortName") {
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

function countSize(root) {
    var sum = 0;
    partition.nodes(root)
        .forEach(function(d) { if (d.size) { sum+=d.size;  } });
    return sum;
}



function pruneDepth(root, depth) {
    var removed = false;
    for (i in root.children){
        var currentNode = root.children[i];
        console.dir("check: " + currentNode.name + " (depth: " + currentNode.depth + ")");

        if (currentNode.depth >= depth) {
            // "delete" current Node 
            console.dir("delete: " + i + " child of " + currentNode.parent.name + " (depth: " + currentNode.parent.depth + ") --> " + currentNode.parent.children[i].name + " (depth: " + currentNode.parent.children[i].depth + ")");
            
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


