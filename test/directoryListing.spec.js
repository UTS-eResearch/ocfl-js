const assert = require("assert");
const path = require("path");
const fs = require("fs-extra");
const Repository = require("../lib/repository");
const OcflObject = require("../lib/ocflObject");

const chai = require("chai");

const expect = chai.expect;
chai.use(require("chai-fs"));


const NRUNS = 20;
const NPATHS = 20;


function createDirectory(aPath) {
  if (!fs.existsSync(aPath)) {
    fs.mkdirSync(aPath);
  }
}

const repositoryPath = path.join(process.cwd(), "./test-data/directory_repo");


async function createTestRepo() {
  fs.removeSync(repositoryPath);
  createDirectory(repositoryPath);
  const repository = new Repository();
  const init = await repository.create(repositoryPath);
  return repository;
}



function randomWord(chars, length) {
  var w = '';
  for( var i = 0; i < length; i++ ) {
    w += String.fromCharCode(97 + Math.floor(chars * Math.random()))
  }
  return w;
}

async function randomTree(chars, length, bail, width, depth) {
  const n = {};
  for( var i = 0; i < width; i++ ) {
    const w = randomWord(chars, length);
    if( !n[w] ) {
      const bailout = Math.random();
      if( bailout > bail && depth > 0 ) {
        n[w] = await randomTree(chars, length, bail, width, depth - 1);
      } else {
        n[w + '.txt'] = 1;
      }
    }
  }
  return n;
}

async function addFile(dir, filename, contents) {
  const filep = path.join(dir, filename);
  await fs.writeFile(filep, contents);
}

async function writeTree(tree, dir) {
  const items = Object.keys(tree);
  for( var i = 0; i < items.length; i++ ) {
    const item = items[i]
    if( typeof(tree[item]) === 'object' ) {
      const subdir = path.join(dir, item);
      await fs.ensureDir(subdir);
      //console.log(`Wrote dir ${subdir}`);
      writeTree(tree[item], subdir);
    } else {
      await addFile(dir, item, item);
      //console.log(`Wrote file ${dir}/${item}`);
    }
  }
}

// returns one path through a tree to depth n
// as a string delimited by forward slashes

function getRandomPathFromTree(tree, n) {
  if( n > 0 && typeof(tree) === 'object' ) {
    const items = Object.keys(tree).filter((i) => {
      return typeof(tree[i]) === 'object'
    });
    if( items.length > 0 ) {
      const item = items[Math.floor(Math.random() * items.length)];
      return item + '/' + getRandomPathFromTree(tree[item], n - 1);
    }
  }
  return '';
}


function getContents(tree, array) {
  //console.log(`array ${JSON.stringify(array)} `)
  const p = array[0];
  if( tree[p] ) {
    if( array.length === 1 ) {
      const contents = Object.keys(tree[p]).map((i) => {
        if( typeof(tree[p][i]) === 'object') {
          return i + '/';
        } else {
          return i;
        }
      });
      return contents;
    } else {
      return getContents(tree[p], array.slice(1))
    }
  } else {
    console.log("getContents failed");
    return null;
  }
}


function directoryListing(state, path) {
  const listing = {};
  const l = path.length;
  Object.keys(state).forEach((hash) => {
    state[hash].forEach((p) => {
      if( p.startsWith(path) ) {
        const rest = p.substring(l).split('/');
        if( rest.length === 1 ) {
          // it's a file
          listing[rest[0]] = 1;
        } else {
          listing[rest[0] + '/'] = 1;
        }
      }
    });
  });
  return Object.keys(listing);
}



describe("Get a directory listing from an inventory", function() {
  
  beforeEach(async function() {
  });


  it("can find the contents of paths in random directory trees", async function() {
    const files = [];

    for( var r = 0; r < NRUNS; r++ ) {
      await fs.remove(repositoryPath);
      const repo = await createTestRepo();
      const tree = await randomTree(6, 3, 0.2, 3, 4);
      const oid = 'object';

      const obj = await repo.createNewObjectContent(oid, async (dir) => {
        await writeTree(tree, dir);
        console.log("At end of writeTree");
      });
      console.log("Reading inventory");
      const inv = await obj.getInventory();
      expect(inv).to.not.be.empty;
      expect(inv.id).to.not.be.null;

      const state = inv['versions']['v1']['state'];

      for( var i = 0; i < NPATHS; i++ ) {
        const treepath = getRandomPathFromTree(tree, 2);
        console.log("Path: " + treepath);
        const patharray = treepath.split('/');
        patharray.pop();
        const contents = getContents(tree, patharray).sort();
        const listing = directoryListing(state, treepath).sort();
        expect(listing).to.eql(contents);
      }
    }
  });


  after(async function() {
    //await fs.remove(repositoryPath);
  });

});

