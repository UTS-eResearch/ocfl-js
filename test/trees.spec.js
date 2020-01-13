const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const hasha = require('hasha');
const _ = require('lodash');


const trees = require('./trees.js');
const utils = require('./repoUtils.js');
const OcflObject = require('../lib/ocflObject');

const DIGEST_ALGORITHM = 'sha512';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-fs'));


const treeRepoPath = path.join(process.cwd(), './test-data/treesRepo');
const treeCreatePath = path.join(process.cwd(), './test-data/tree');


function treeToPaths(tree) {
  const paths = [];
  Object.keys(tree).forEach((item) => {
    if( typeof(tree[item]) === 'object' ) {
      treeToPaths(tree[item]).forEach((subPath) => {
        paths.push(path.join(item, subPath))
      });
    } else {
      paths.push(item)
    }
  })
  return paths;
}



function checkTreeInventory(tree, state) {
  console.log(JSON.stringify(tree));
  const paths = treeToPaths(tree);
  paths.forEach((p) => {
    const found = Object.keys(state).filter((h) => state[h].includes(p));
    expect(found).to.have.lengthOf(1, `looking for ${p} in inventory`);
    if( found.length === 1 ) {
      delete(state[found[0]]);
    }
  });
  expect(state).to.be.empty;
}




describe('create trees and import them into OCFL', async function () {



  it('can create and then import a tree', async function () {
    await fs.remove(treeCreatePath);
    await fs.ensureDir(treeCreatePath);

    // build a tree

    const tree = await trees.randomTree(6, 3, 0.2, 3, 3);
    await trees.writeTree(tree, treeCreatePath);

    // import it into an OCFL repo

    const repo = await utils.createTestRepo(treeRepoPath);

    const obj = await repo.importNewObjectDir('objectid', treeCreatePath);
    expect(obj.ocflVersion).to.equal('1.0');

    const inv = await obj.getInventory();

    expect(inv).to.not.be.empty;

    checkTreeInventory(tree, inv['versions']['v1']['state']);

  });

     
});






