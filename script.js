// visualisation settings
var vis = {
    width: 800,
    height: 800,
    
    donutWidth: 75
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

// define partition size
/*var partition = d3.layout.partition()
    //.sort(null);
    .value(function(d) { return d.size; });*/

// init arc donut ring
/*var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, arcLength(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, arcLength(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, arcDistance(d.y)); })
    .outerRadius(function(d) { return Math.max(0, arcDistance(d.y + d.dy)); });*/

var partition = d3.layout.partition()
    .sort(null)
    .size([2 * Math.PI, radius * 1])
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


// load and process data
d3.json("asyl.json", function(error, data) {
    if (error) throw error;
    partition(data);
    var newData = transformTree(data);
    draw(newData)
});


function draw(data)
{
    // *********************    tooltip / infobox   ******************************** //
    var tooltip = d3.select('.tooltip')

    // ********************     pie slices      ************************************** //
    var groupes = svg.selectAll("g")
        .data(partition(data))
        .enter()
      .append("svg:g");

    var slice = groupes.append("svg:path")
        .attr('class', function(d) { return "slice-" + d.depth; })
        .attr("id", function(d, i) { return "path-" + i; })
        .attr("d", arc)
        .style("fill", function(d) { return fill(d); })
        .attr("fill-rule", "evenodd")
        .attr('display', function(d, i) {if(i==0) return "none";});

    //slice.on('click', transformTree);
    

    // get total size
    var totalSize = data.value;

    slice.on('mouseenter', function(d) {
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
    slice.on('mousemove', function(d) {
        tooltip.style('left', (d3.event.pageX + 2) + 'px')
               .style('top', (d3.event.pageY + 2) + 'px');
    });

    slice.on('mouseleave', function(d) {
        unhighlight(d);
        tooltip.style('display', 'none');
    });
    // ***************************************************************************** //


    // **************************     label            ***************************** //
    var text = groupes.append("svg:text")
        .attr('class', function(d, i) {
            if (i == 0) return "title";
            else return "label";
        })
        .attr("id", function(d, i) { return "label-" + i; })
        .attr("display", function(d, i) { if (d.value ==  0) return "none";})
        .attr("pointer-events", "none")
        .attr("text-anchor", function(d) {
        return (d.x + d.dx / 2) > Math.PI ? "end" : "start";
        })
        .attr("transform", function(d, i) { 
            var angle = (d.x + d.dx / 2 - Math.PI / 2) / Math.PI * 180 ;
            if (i != 0) { return "rotate(" + angle + ")translate(" + (d.y+padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
        }})
        .text(function(d) { return d.name; });

    // for root node 
    text.append("tspan")
        .attr("x", 0)
        .attr("dy", "1em")
        .text(function(d, i) { if (i==0) return d.value; });   
    // ***************************************************************************** //

}

function transformTree(d){
    var root = d;
    while (root.parent) root = root.parent;

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

    var data = root;

    var depth1 = 2,
        depth2 = 3;

    // get all parent nodes (tree's) from depth1
    var inputTrees = getNodes(data, depth1-1);

    // process each under tree
    for (i in inputTrees){
        processTree(inputTrees[i]);
    }

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
    if (key === "parent" || key === "dx" || key === "x" ||key === "y" || key === "dy" || key === "depth" || key === "shortName") {
        return undefined;
    }
    return value;
}

function processTree(d){
    
    // clone tree data
    var tree = JSON.parse(JSON.stringify(d, replacer));

    // get new childrens
    var newChilds = [];
    for (i in tree.children[0].children){
        newChilds.push(tree.children[0].children[i]);
    }

    // define "under tree" for each new child  
    var underTreeObjects = []
    for (t in newChilds){
        var underTreeObject = newChilds[t];      
        
        // use original tree because stree structure is allready incomplete...
        var oldTree = JSON.parse(JSON.stringify(d, replacer));

        // get old childs 
        var oldChilds = [];
        for (i in oldTree.children){
            oldChilds.push(tree.children[i]);
        }

        // find right child for each old child
        var childIndex = 0;
        var childObjects = []
        var childChildObjects = [];
        for (oc in oldChilds){
            var childObject = oldChilds[oc];

            // find corresponding child child
            for (cc in childObject.children){
                var childChildObject = childObject.children[cc];

                if (underTreeObject.name === childChildObject.name){    
                    childObject['children'] = childChildObject.children;
                    childObjects.push(childObject);
                    break;
                }
            }
        }

        underTreeObject['children'] = childObjects;        
        underTreeObjects.push(underTreeObject);
    }

    tree['children'] = underTreeObjects;
}

function getNodes(root, depth){
    var nodes = [];

    for (i in root.children){
        var currentNode = root.children[i];

        if (currentNode.depth === depth) {
            nodes.push(currentNode);

            continue;
        }
        nodes.push(getNodes(currentNode, depth));
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
