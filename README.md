## Development of this package has moved to: https://github.com/Language-Research-Technology/ocfl-js

# About

This is a pre-alpha nodejs library implement the (emerging) Oxford Common File Layout specification.

# Audience

This is for Javascript/Nodejs developers who know how to work with asyncronous
libraries. Until we build up a proper set of examples and documentation, the [tests](./test)
and [demo](./demo.js) script show how to use the library.

# Status

This is pre-alpha code which works but is not a complete implementation of the spec.

What's working:
-  Initialising a new (in an exsiting empty directory) or existing OCFL repository of version 1.0.
-  Adding content from a directory to the the repository with an ID - the repository can store OCFL objects using Pairtree.
-  Adding a new version of an object be inporting a new directory with the same ID.
-  List all objects

# Installation

## Install via git

1. Get the code:
  ```git clone https://github.com/UTS-eResearch/ocfl-js.git```
2. Install it
	```
	cd ocfl-js
	npm install .
	```
3. Check that it works, but running the the tests
	```
	mocha
	```

Running the tests will create an example repository in ./test-data called `ocfl1` with a single item in it with 4 versions.


## What we've got so far

Some tests. Run them with:
    mocha

A [demo](./demo.js) script that shows usage - how to intialise a repository (in
an empty directory) and add some simple file based content, then export all (two
of) the objects in the repository in all their versions.

Run the demo by typing:
   node demo.js

Inspect the output in `demo/export`
