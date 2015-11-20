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
    partition(data);
    console.log("first input data: ");
    console.log(data);
    console.log("#####################################");

    var newData = transformTree(data);
    //var newData = data;

    console.log("#####################################");
    console.log("transformed data:  ");
    console.log(newData);
    console.log("#####################################");

    draw(newData)
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
    var totalSize = data.value;

    // create arc visualisation
    //console.log("call draw method:");

    // *********************    tooltip / infobox   ******************************** //
    var tooltip = d3.select('.tooltip')


    // ********************     pie slices      ************************************** //
    var slice = svg.select(".slices").selectAll("path.slice")
        .data(partition(data));

    slice.enter()
        .append("path")
        .attr('class', "slice")
        .attr("id", function(d, i) { return "path-" + i; })
        .attr("d", arc)
        .attr('display', function(d, i) {if(i==0) return "none";});

    //slice.on('click', transformTree);

    slice.on('mouseenter', function(d) {
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
        tooltip.style('display', 'none');
    });

    slice.exit()
        .remove();
    // ***************************************************************************** //

    // **************************     label            ***************************** //
    var text = svg.select(".labels").selectAll("text")
        .data(partition(data));

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
        .attr("display", function(d, i) { if (d.value ==  0) return "none";})
        .attr("transform", function(d, i) { 
            if (i != 0) return "translate(" + arc.centroid(d) + ")";
        })
        .text(function(d) { return d.name; });

    textEnter.append("tspan")
        .attr("x", 0)
        .attr("dy", "1em")
        .text(function(d, i) { if (i==0) return d.value; });

    text.exit()
        .remove();
    // ***************************************************************************** //

}

function transformTree(data){
    var depth1 = 2,
        depth2 = 3;

    console.log("size of old data  " + countSize(data));

    var newData = data;
    //var newData = jQuery.extend(true, {}, data);

    // get all root nodes (tree's) depth -1
    var inputTrees = getNodes(newData, depth1-1);
    console.log("length of input tree'S  " + Object.keys(inputTrees).length);

    // process each under tree
    for (i in inputTrees){
        processTree(inputTrees[i]);
    }

    console.log("DELEEEETE");
    resetData(newData);

    return newData;
}
function processTree(root){
    var tree = root;
    console.log("#####################################");
    console.log("input tree: ");
    console.log(tree);
    
    // get new childrens and replace
    var newChilds = [];
    console.log("new childs: ");
    for (i in tree.children[0].children){
        console.log(tree.children[0].children[i]);
        newChilds.push(tree.children[0].children[i]);
    }

    var oldChilds = [];
    console.log("old childs: ");
    for (i in tree.children){
        console.log(tree.children[i]);
        oldChilds.push(tree.children[i]);
        //tree.children[i] = [];
    }

    // find new under tree
    var combinedUnderTree = []
    for (t in newChilds){
        var underTree = newChilds[t];
        console.log("+++++++ underTree: +++++++++");
        console.log(underTree);

        var childArray = [];
        var index = 0;
        for (oc in oldChilds){
            var oldChild = oldChilds[oc];
            console.log("push into childArray :  " + oldChild.name);
            childArray.push(oldChild);

            // find corresponding child child
            for (cc in oldChild.children){
                var childChild = oldChild.children[cc];

                console.log(underTree.name + " === " + childChild.name);
                if (underTree.name === childChild.name){
                    var childChildArray = [];

                    for (c in childChild.children){
                        var childChildChild = childChild.children[c]

                        console.log("push into childChildArray :  " + childChildChild.name);
                        childChildArray.push(childChildChild);
                    }
                    console.log("childchildArray:  ");
                    console.log(childChildArray);
                    childArray[index]['children'] = childChildArray;
                    break;
                }
            }
            ++index;
        }
        console.log("childArray:  ");
        console.log(childArray);

        underTree['children'] = childArray;
        console.log("underTree:  ");
        console.log(underTree);
        console.log("++++++++++++++++++++++++++++");

        combinedUnderTree.push(underTree);
    }

    console.log("combinedUnderTree:  ");
    console.log(combinedUnderTree);
    tree['children'] = combinedUnderTree;

    console.log("FINAL TREE :  ");
    console.log(tree);
    console.log("#####################################");
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
    if (root.depth === 0){
        console.log(root);
        delete root['value'];
        delete root['size'];
        delete root['depth'];
    }
    for (i in root.children){
        var currentNode = root.children[i];
        if(currentNode.children){
            console.log(currentNode);
            delete currentNode['value'];
            delete currentNode['size'];
            delete currentNode['depth'];
        }
        resetData(currentNode);
    }
}

function countSize(root) {
    var size = 0;
    for (i in root.children){
        var currentNode = root.children[i];
        if(currentNode.size){
            size += currentNode.size
        }
        size += countSize(currentNode, size);
    }
    return size;
}



function pruneDepth(root, depth) {
    var removed = false;
    for (i in root.children){
        var currentNode = root.children[i];
        console.log("check: " + currentNode.name + " (depth: " + currentNode.depth + ")");

        if (currentNode.depth >= depth) {
            // "delete" current Node 
            console.log("delete: " + i + " child of " + currentNode.parent.name + " (depth: " + currentNode.parent.depth + ") --> " + currentNode.parent.children[i].name + " (depth: " + currentNode.parent.children[i].depth + ")");
            
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
