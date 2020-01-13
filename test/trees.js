// utilities for creating random trees and writing them out as directories

const path = require("path");
const fs = require("fs-extra");


function randomWord(chars, length) {
  var w = '';
  for( var i = 0; i < length; i++ ) {
    w += String.fromCharCode(97 + Math.floor(chars * Math.random()))
  }
  return w;
}

// TODO: useful set of default values

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



module.exports = {
  randomTree: randomTree,
  writeTree: writeTree,
  getRandomPathFromTree: getRandomPathFromTree
}