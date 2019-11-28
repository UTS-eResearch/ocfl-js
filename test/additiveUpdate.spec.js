const assert = require("assert");
const path = require("path");
const fs = require("fs-extra");
const Repository = require("../lib/repository");
const OcflObject = require("../lib/ocflObject");

const chai = require("chai");

const expect = chai.expect;
chai.use(require("chai-fs"));


function createDirectory(aPath) {
  if (!fs.existsSync(aPath)) {
    fs.mkdirSync(aPath);
  }
}

const repositoryPath = path.join(process.cwd(), "./test-data/ocfl2");

async function createTestRepo() {
  fs.removeSync(repositoryPath);
  createDirectory(repositoryPath);
  const repository = new Repository();
  const init = await repository.create(repositoryPath);
  return repository;
}


async function addFile(base, dir, filename, contents) {
  const ndir = path.join(base, dir);
  await fs.ensureDir(ndir);
  const filep = path.join(ndir, filename);
  await fs.writeFile(filep, contents);
}




describe("Additive merging of new content", function() {

  before(async function() {
    await fs.remove(repositoryPath);
  });


  it("can add distinct files to existing content using additive merge", async function() {
    const repo = await createTestRepo();
    const files = [];
    const obj = await repo.createNewObjectContent(null, async (dir) => {
      for( var i = 0; i < 10; i++ ) {
        const sd = `subdir${i}`;
        const file = 'file.txt';
        const fn = await addFile(dir, sd, file, 'contents ' + i);
        files.push(path.join(sd, file));
      }
    });
    const inv = await obj.getInventory();
    expect(inv).to.not.be.empty;
    const oid = inv.id;
    expect(oid).to.not.be.null;

    // do an additive update, which should leave the ten 
    // files we added at creation in the inventory

    await repo.createNewObjectContent(oid, async (dir) => {
      for ( var i = 10; i < 20; i++ ) {
        const sd = `subdir${i}`;
        const file = 'file.txt';
        const fn = await addFile(dir, sd, file, 'contents ' + i);
        files.push(path.join(sd, file));
      }
    }, true); 

    const obj2 = await repo.getObject(oid);
    const inv2 = await obj2.getInventory();
    const v = inv2.head;
    expect(v).to.equal('v2');

    // because we know all the files are unique, we can unwrap
    // the inventory state 

    const state = inv2['versions'][v]['state'];
    const inv_files = Object.keys(state).map((h) => state[h][0]);

    expect(inv_files).to.have.members(files);

  });

  after(async function() {
    //await fs.remove(repositoryPath);
  });

});
