- [About](#about)
- [Audience](#audience)
- [Status](#status)
- [Installation](#installation)
	- [Install via git](#install-via-git)
- [Overview](#overview)
- [API](#api)
	- [Repository](#repository)
		- [Creating a repository](#creating-a-repository)
		- [Check if path is a repository](#check-if-path-is-a-repository)
		- [Find objects in a repository - THIS IS AN EVENT EMITTER](#find-objects-in-a-repository---this-is-an-event-emitter)
	- [OCFL Object](#ocfl-object)
		- [Create an object with an ID - ingest a folder](#create-an-object-with-an-id---ingest-a-folder)
		- [Create an object with a path](#create-an-object-with-a-path)
		- [Create an object with an ID - pass in a callback that will write to deposit path](#create-an-object-with-an-id---pass-in-a-callback-that-will-write-to-deposit-path)
		- [Check if object exists at path](#check-if-object-exists-at-path)
		- [Check if object can be created in the repo at path](#check-if-object-can-be-created-in-the-repo-at-path)
		- [Load an object and getLatestInventory](#load-an-object-and-getlatestinventory)
		- [Get object versions](#get-object-versions)
		- [Load object and get information from it](#load-object-and-get-information-from-it)
		- [Resolve file path relative to object root](#resolve-file-path-relative-to-object-root)
		- [Export an object](#export-an-object)
		- [Remove an object](#remove-an-object)

# About

This is a pre-alpha nodejs library implement the (emerging) Oxford Common File Layout specification.

# Audience

This is for Javascript/Nodejs developers who know how to work with asyncronous
libraries. Until we build up a proper set of examples and documentation, the [tests](./test)
and [demo](./demo.js) script show how to use the library.

# Status

This is pre-alpha code which works but is not a complete implementation of the spec.

What's working:

- Initialising a new (in an exsiting empty directory) or existing OCFL repository of version 1.0.
- Adding content from a directory to the the repository with an ID - the repository can store OCFL objects using Pairtree.
- Adding a new version of an object be inporting a new directory with the same ID.
- List all objects

# Installation

## Install via git

1. Get the code:
   `git clone https://github.com/UTS-eResearch/ocfl-js.git`
2. Install it
   ```
   cd ocfl-js
   npm install .
   ```
3. Check that it works, by running the tests
   ```
   npm run tests
   ```

Running the tests will create an example repository in ./test-data called `ocfl1` with a single item in it with 4 versions.

# Overview

There are two main entry points - Repository and OcflObject. Repository is used to create a repository and
find objects within a repository whilst OcflObject encapsulates all operations of an object such that it can be used
standalone to the Repository (if you have an object in a path somewhere but there is no actual repo).

# API

## Repository

### Creating a repository

```
// ensure the target folder for the repo exists
if (!await fs.exists(ocflRoot)) await fs.mkdirp(ocflRoot);

// define the repo
repository = new Repository({ ocflRoot: 'some path' });

// create it
await repository.create())
```

### Check if path is a repository

```
// define the repo
repository = new Repository({ ocflRoot: 'some path' });

// check for namaste file and return true or false
await repository.isRepository()
```

### Find objects in a repository - THIS IS AN EVENT EMITTER

```
// define the repo
repository = new Repository({ ocflRoot: 'some path' });

// find objects
 repository.findObjects({});

// register with the 'object' event
repository.on("object", object=> {
	console.log(object)
	// returns an object that can be used in the constructor for OcflObject
});
```

## OCFL Object

### Create an object with an ID - ingest a folder

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

// create (v1) or update object with content at `source`
await object.update({ source: '/path/to/some/content' });

// add some data to content at `source`

// update object with content at `source` - v2
await object.update({ source: '/path/to/some/content' });

```

### Create an object with a path

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', objectPath: '/path/to/object' });

```

### Create an object with an ID - pass in a callback that will write to deposit path

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

// create (v1) or update object with content at `source`
await object.update({ writer: writeContent  });

async function writeContent({ target }) {
	for (let file of files ) {
		await // write file to target (DEPOSIT PATH)
	}
}

```

### Check if object exists at path

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

await object.isObject()
```

### Check if object can be created in the repo at path

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

await object.isAvailable()
```

### Load an object and getLatestInventory

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

// load the object
await object.load();

// get the latestInventory
const inventory = await object.getLatestInventory();
```

### Get object versions

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

// load the object
await object.load()

// get the versions of the object
let versions = object.getVersions()
```

### Load object and get information from it

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

// load the object
await object.load()

// get latest inventory
let r = await object.getLatestInventory()

// get latest version state (the manifest of files for that version)
let r = await object.getLatestVersion()

// get specific version inventory
let r = await object.getInventory({version: 'v2'})

// get specific version state
let r = await object.getVersion({version: 'v2'})

// load all version states in one hit - COULD BE VERY EXPENSIVE
await object.getAllVersions()
```

### Resolve file path relative to object root

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

// resolve a path relative to the object root
file = object.resolveFilePath({ filePath: 'relative/path/to/file})

// returns a full path to the object relative to ocflRoot
```

### Export an object

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

// export it
await object.export({target: '/path/to/export/folder' })

// OR export a specific version of the object
await object.export({target: '/path/to/export/folder', version: 'v2'  })

```

### Remove an object

```
// define the object
let object = new OcflObject({ ocflRoot: 'some-path', id: 'some-id });

// remove it
await object.remove()
```
