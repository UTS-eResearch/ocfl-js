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

const repositoryPath = path.join(process.cwd(), "./test-data/additive_repo");
const importPath = path.join(process.cwd(), "./test-data/additive_import");
const exportPath = path.join(process.cwd(), "./test-data/additive_export");


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


async function addFiles(base, a, b) {
  files = [];
  for( var i = a; i <= b; i++ ) {
    const sd = `subdir${i}`;
    const file = 'file.txt';
    const content = 'content ' + i;
    const fn = await addFile(base, sd, file, content);
    files.push([path.join(sd, file), content]);
  }
  return files;
}

describe("Additive merging of new content", function() {
  
  beforeEach(async function() {
    await fs.remove(repositoryPath);
    await fs.remove(importPath);
    await fs.remove(exportPath);
  });


  it("can add distinct files to existing content using additive merge and createNewObjectContent", async function() {
    const files = [];

    const repo = await createTestRepo();
    const obj = await repo.createNewObjectContent(null, async (dir) => {
      const files1 = await addFiles(dir, 0, 9);
      files.push(...files1);
    });

    const inv = await obj.getInventory();
    expect(inv).to.not.be.empty;
    const oid = inv.id;
    expect(oid).to.not.be.null;

    // do an additive update, which should leave the ten 
    // files we added at creation in the inventory

    await repo.createNewObjectContent(oid, async (dir) => {
      const files2 = await addFiles(dir, 10, 19);
      files.push(...files2);
    }, true); 

    const obj2 = await repo.getObject(oid);
    const inv2 = await obj2.getInventory();
    const v = inv2.head;
    expect(v).to.equal('v2');

    // because we know all the files are unique, we can unwrap
    // the inventory state 

    const state = inv2['versions'][v]['state'];
    const inv_files = Object.keys(state).map((h) => state[h][0]);
    const filenames = files.map((f) => f[0]);

    expect(inv_files).to.have.members(filenames);

    await fs.ensureDir(exportPath);
    await repo.export(oid, exportPath);

    files.forEach((f) => {
      const fpath = path.join(exportPath, f[0]);
      expect(fpath).to.be.a.file(`${fpath} is a file`).with.content(f[1]);
    })

  });


  it("can add distinct files to existing content using additive merge and importNewObjectDir", async function() {
    const files = [];

    const repo = await createTestRepo();
    const obj = await repo.createNewObjectContent(null, async (dir) => {
      const files1 = await addFiles(dir, 0, 9);
      files.push(...files1);
    });

    const inv = await obj.getInventory();
    expect(inv).to.not.be.empty;
    const oid = inv.id;
    expect(oid).to.not.be.null;

    // create the new files in an import directory

    const files2 = await addFiles(importPath, 10, 19);
    files.push(...files2);

    // do an additive update, which should leave the ten 
    // files we added at creation in the inventory

    await repo.importNewObjectDir(oid, importPath, true); 

    const obj2 = await repo.getObject(oid);
    const inv2 = await obj2.getInventory();
    const v = inv2.head;
    expect(v).to.equal('v2');

    // because we know all the files are unique, we can unwrap
    // the inventory state 

    const state = inv2['versions'][v]['state'];
    const inv_files = Object.keys(state).map((h) => state[h][0]);
    const filenames = files.map((f) => f[0]);

    expect(inv_files).to.have.members(filenames);

    await fs.ensureDir(exportPath);
    await repo.export(oid, exportPath);

    files.forEach((f) => {
      const fpath = path.join(exportPath, f[0]);
      expect(fpath).to.be.a.file(`${fpath} is a file`).with.content(f[1]);
    })

  });



  it.skip("can add existing files to existing content using additive merge", async function() {
    const files = [];

    const repo = await createTestRepo();
    const obj = await repo.createNewObjectContent(null, async (dir) => {
      for( var i = 0; i < 10; i++ ) {
        const sd = `subdir${i}`;
        const file = 'file.txt';
        const content = 'content ' + i;
        const fn = await addFile(dir, sd, file, content);
        files.push([path.join(sd, file), content]);
      }
    });
    const inv = await obj.getInventory();
    expect(inv).to.not.be.empty;
    const oid = inv.id;
    expect(oid).to.not.be.null;

    // do an additive update, with content we know already exists

    await repo.createNewObjectContent(oid, async (dir) => {
      const sd = 'subdir10';
      const file = 'file.txt';
      const content = 'content 0';
      const fn = await addFile(dir, sd, file, content);
      files.push([path.join(sd, file), content]);
    }, true);

    const obj2 = await repo.getObject(oid);
    const inv2 = await obj2.getInventory();
    const v = inv2.head;
    expect(v).to.equal('v2');


    const state = inv2['versions'][v]['state'];

 
    const inv_files = Object.keys(state).map((h) => state[h][0]);
    const filenames = files.map((f) => f[0]);

    expect(inv_files).to.have.members(filenames);

    await fs.ensureDir(exportPath);
    await repo.export(oid, exportPath);

    files.forEach((f) => {
      const fpath = path.join(exportPath, f[0]);
      expect(fpath).to.be.a.file(`${fpath} is a file`).with.content(f[1]);
    })


  });

  after(async function() {
    //await fs.remove(repositoryPath);
  });

});

