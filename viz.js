var stdout = process.stdout,
    fs = require('fs'),
    spawn = require('child_process').spawn,
    package = require('./package.json');

// Start Configuration

var opts = require('nomnom')
      .option('profile', {
        position: 0,
        required: true,
        help: "Chrome CPU profile (JSON file)"
      }).option('output', {
        abbr: 'o',
        default: 'out.gif',
        help: "Output image file"
      }).option('format', {
        abbr: 'f',
        default: 'gif',
        help: "Output image format (passed to dot)\n" +
          "\tsee www.graphviz.org/doc/info/output.html)"
      }).option('pruneDepth', {
        abbr: 'p',
        default: 0,
        help: "Depth at which to prune functions whose callees hit count is less or equal to sampleLimit"
      }).option('sampleLimit', {
        abbr: 's',
        default: '10',
        help: "Number of samples required for inclusion in the call tree"
      }).option('maxLabelLength', {
        abbr: 'l',
        default: 30,
        help: "Maximum length of a vertex label (derived from function name)"
      }).option('debug', {
        abbr: 'd',
        flag: true,
        help: "Output the generated dot file to stdout"
      }).option('version', {
        abbr: 'v',
        flag: true,
        callback: function() {
          return "Version " + package.version;
        }
      }).parse();

var pruneDepth = opts.pruneDepth,
    sampleLimit = opts.sampleLimit,
    nameLimit = opts.maxLabelLength;
// End Configuration



// Start Stats collection
var profile = JSON.parse(fs.readFileSync(opts.profile));
var totalHitcount = profile.samples.length;

stdout.write("Found " + totalHitcount + " samples\n");

// Calculate the cumulative hitcount for all nodes
// Do any pruning while we're at it
stdout.write("Calculating callee hit counts:\n");
var pruned = calculateCumulativeHitcount(profile.head, 0);
stdout.write("\tPruned " + pruned + " small nodes\n");
stdout.write("\tComplete\n");
// End stats collection



// Start Dot Generation
stdout.write("Generating dot file:\n");

// Generate the dot header with required options
var dotFile = "digraph cpuprofile {\n";
writeGraph(profile.head);
dotFile += "}";

stdout.write("\tComplete\n");
// End Dot Generation

if(opts.debug) {
  stdout.write(dotFile);
}

// Generate output file with dot
stdout.write("Generating output file:\n");
// stdout.write(opts.outformat + "|" + opts.outfile);
var dot = spawn('dot', ['-T' + opts.format, "-o " + opts.output]);
dot.stdin.write(dotFile);
dot.stdin.end();

dot.on('close', function(code) {
  if(code === 0) {
    stdout.write("\tComplete\n");
  } else {
    stdout.write("\tFailed (" + code + ")\n");
  }
});


// Helper to write a DOT vertex with label
function writeVertex(id, label) {
  var color = "Blue";
  if(label === '(anonymous function)') {
    color = "Black";
  }

  if(label.length > nameLimit) {
    label = label.substring(0, nameLimit);
  }

  dotFile += "  " + id + " [label=\"" + label + "\" color=" + color + "]\n";
}

// Helper to write a DOT edge with label
function writeEdge(vertexA, vertexB, label) {
    dotFile += "  " + vertexA + " -> " + vertexB + "[label=\"" + label + "\"]\n";
}

function calculateCumulativeHitcount(node, level) {
  var pruned = 0;

  node.childHitcount = node.hitCount;

  // Use a reverse for loop so we can splice
  for(var i=node.children.length-1; i>=0; --i) {
    var child = node.children[i];

    pruned += calculateCumulativeHitcount(child, level + 1);

    node.childHitcount += child.childHitcount;

    if(child.childHitcount < sampleLimit && level >= pruneDepth) {
      node.children.splice(i, 1);
      pruned++;
    } else if (child.functionName === '(idle)' || child.functionName === '(program)') {
      node.children.splice(i, 1);
      totalHitcount -= child.hitCount;
      stdout.write("\tPruning " + child.hitCount + " samples for " + child.functionName + "\n");
    }
  };

  return pruned;
}

function writeGraph(node) {
  writeVertex(node.id, node.functionName);

  node.children.forEach(function(child) {
    writeGraph(child);
    writeEdge(node.id, child.id, Math.floor(((child.childHitcount / totalHitcount) * 1000)/10) );
  });
}
