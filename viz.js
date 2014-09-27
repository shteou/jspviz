var fs = require('fs'),
    stdout = process.stdout;

if(process.argv.length < 3) {
  console.error("Usage is: viz.js profile");
  process.exit(1);
}

var profile = JSON.parse(fs.readFileSync(process.argv[2]));


// CONFIG
var pruneDepth = 0,
    samplesLimit = 5,
    nameLimit = 30;


var totalHitcount = profile.samples.length;



// Calculate the cumulative hitcount for all nodes
// Do any pruning while we're at it
calculateCumulativeHitcount(profile.head, 0);

// Write the graph to stdout
stdout.write("digraph cpuprofile {\n");
stdout.write("rankdir=LR;\n");
writeGraph(profile.head);
stdout.write("}");



// Helper to write a DOT vertex with label
function writeVertex(id, label) {
  var color = "Blue";
  if(label === '(anonymous function)') {
    color = "Black";
  }

  if(label.length > nameLimit) {
    label = label.substring(0, nameLimit);
  }

  stdout.write("  " + id + " [label=\"" + label + "\" color=" + color + "]\n");
}

// Helper to write a DOT edge with label
function writeEdge(vertexA, vertexB, label) {
    stdout.write("  " + vertexA + " -> " + vertexB + "[label=\"" + label + "\"]\n");
}

function calculateCumulativeHitcount(node, level) {
  node.childHitcount = node.hitCount;

  // Use a reverse for loop so we can splice
  for(var i=node.children.length-1; i>=0; --i) {
    var child = node.children[i];

    calculateCumulativeHitcount(child, level + 1);

    node.childHitcount += child.childHitcount;

    if(child.childHitcount < samplesLimit && level >= pruneDepth) {
      node.children.splice(i, 1);
    } else if (child.functionName === '(idle)' || child.functionName === '(program)') {
      node.children.splice(i, 1);
      totalHitcount -= child.hitCount;
    }
  };
}

function writeGraph(node) {
  writeVertex(node.id, node.functionName);

  node.children.forEach(function(child) {
    writeGraph(child);
    writeEdge(node.id, child.id, Math.floor(((child.childHitcount / totalHitcount) * 1000)/10) );
  });
}
