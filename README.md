jspviz
======

JavaScript Profile Visualiser - WebKit Inspector (Chrome) CPU profile to DOT utility

This script takes a WebKit Inspector CPU profile file (JSON format) and converts it to a dot digraph.
It then runs the digraph through dot to produce an image output.

Usage
-----

First generate a CPU profile using the WebKit Inspector profile tools.
Once complete, save the profile from the UI.

Run viz.js providing the profile as the first parameter.

Run viz.js with --help for more information on command line parameters.
