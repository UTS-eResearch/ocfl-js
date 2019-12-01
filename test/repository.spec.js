const assert = require("assert");
const path = require("path");
const fs = require("fs-extra");
const uuidv4 = require("uuidv4");
const pairtree = require("pairtree");
const hasha = require("hasha");
const Repository = require("../lib/repository");
const OcflObject = require("../lib/ocflObject");

const chai = require("chai");

const expect = chai.expect;
chai.use(require("chai-fs"));

const DIGEST_ALGORITHM = "sha512";

describe("Repository initialisation", () => {
  let repository;
  const ocflRoot = "test-output";
  beforeEach(async () => {});
  afterEach(async () => {
    await fs.remove(ocflRoot);
  });

  it(`should be able to create a repository`, async () => {
    if (!(await fs.exists(ocflRoot))) await fs.mkdirp(ocflRoot);
    repository = new Repository({ ocflRoot });
    expect(repository.ocflRoot).to.equal(ocflRoot);

    expect(await repository.create()).to.not.throw;
  });
  it(`should fail to create a repository - folder doesn't exist`, async () => {
    repository = new Repository({ ocflRoot });
    try {
      await repository.create();
    } catch (error) {
      expect(error.message).to.equal("Directory does not exist");
    }
  });
  it(`should fail to create a repository - already a repo`, async () => {
    if (!fs.existsSync(ocflRoot)) await fs.mkdirp(ocflRoot);
    repository = new Repository({ ocflRoot });
    await repository.create();
    try {
      await repository.create();
    } catch (error) {
      expect(error.message).to.equal(
        "This repository has already been initialized."
      );
    }
  });
  it(`should fail to create a repository - not empty folder`, async () => {
    repository = new Repository({ ocflRoot: "./test-data" });
    try {
      await repository.create();
    } catch (error) {
      expect(error.message).to.equal(
        `Can't initialise a repository as there are already files.`
      );
    }
  });
  it(`should find a repository`, async () => {
    repository = new Repository({ ocflRoot });
    if (!fs.existsSync(ocflRoot)) await fs.mkdirp(ocflRoot);
    await repository.create();
    expect(await repository.isRepository()).to.be.true;
  });
  it(`should not find a repository`, async () => {
    repository = new Repository({ ocflRoot: "./test-data" });
    expect(await repository.isRepository()).to.be.false;
  });
  it(`should find one object in the repository - THIS IS AN EMITTER`, async () => {
    // create a repository
    if (!fs.existsSync(ocflRoot)) await fs.mkdirp(ocflRoot);
    repository = new Repository({ ocflRoot });
    expect(repository.ocflRoot).to.equal(ocflRoot);
    await repository.create();

    let object = new OcflObject({ ocflRoot, id: "xx1" });
    await object.update({ source: "./test-data/simple-ocfl-object" });

    repository.findObjects({});
    repository.emitter.on("object", object => {
      expect(object.match("/xx/1")[0]).to.equal("/xx/1");
    });
  });
  it(`should find 3 objects in the repository - THIS IS AN EMITTER`, async () => {
    // create a repository
    if (!fs.existsSync(ocflRoot)) await fs.mkdirp(ocflRoot);
    repository = new Repository({ ocflRoot });
    expect(repository.ocflRoot).to.equal(ocflRoot);
    await repository.create();

    let object = new OcflObject({ ocflRoot, id: "xx1" });
    await object.update({ source: "./test-data/simple-ocfl-object" });
    object = new OcflObject({ ocflRoot, id: "xx2" });
    await object.update({ source: "./test-data/simple-ocfl-object" });
    object = new OcflObject({ ocflRoot, id: "xx3" });
    await object.update({ source: "./test-data/simple-ocfl-object" });

    repository.findObjects({});
    let objects = [];
    repository.emitter.on("object", object => objects.push(object));
    setTimeout(() => {
      expect(objects.length).to.equal(3);
    }, 200);
  });
});

// function createDirectory(aPath) {
//   if (!fs.existsSync(aPath)) {
//     fs.mkdirSync(aPath);
//   }
// }

// Path constants
// const repositoryPath = path.join(process.cwd(), "./test-data/ocfl1");
// const sourcePath1 = path.join(process.cwd(), "./test-data/ocfl-object1-source");
// const sourcePath1_additional_files = sourcePath1 + "_additional_files";

// async function createTestRepo() {
//   fs.removeSync(repositoryPath);
//   createDirectory(repositoryPath);
//   const repository = new Repository();
//   const init = await repository.create(repositoryPath);
//   return repository;
// }

// describe.skip("repository initialisation", function() {
//   beforeEach(async () => {
//     createDirectory(repositoryPath);
//     repository = new Repository({ ocflRoot: repositoryPath });
//     await repository.create();
//     return repository;
//   });
//   afterEach(async () => {
//     await fs.remove(repositoryPath);
//   });
//   it("should not initialise an existing repository", async function() {
//     try {
//       const init = await repository.create();
//     } catch (e) {
//       assert.strictEqual(
//         e.message,
//         "This repository has already been initialized."
//       );
//     }
//   });
//   it("should not initialise directories with files", async function() {
//     const repository = new Repository({ ocflRoot: "." });
//     try {
//       const init = await repository.create();
//     } catch (e) {
//       assert.strictEqual(
//         e.message,
//         "Can't initialise a repository as there are already files."
//       );
//     }
//   });
//   it("Should verify a repository", async function() {
//     const repository = new Repository({ ocflRoot: repositoryPath });
//     const result = await repository.isRepository();
//     expect(result).to.be.true;
//   });
//   it("Should not verify a nonexistent directory as a repository", async function() {
//     const repository = new Repository({
//       ocflRoot: "some other not yet created"
//     });
//     try {
//       const result = await repository.isRepository();
//     } catch (e) {
//       expect(e.message).to.equal("Directory does not exist.");
//     }
//   });
//   it("Should not verify a repository without a namaste file", async function() {
//     const repository = new Repository({ ocflRoot: repositoryPath });
//     try {
//       await fs.unlink(path.join(repositoryPath, "0=ocfl_1.0"));
//       const result = await repository.isRepository();
//     } catch (e) {
//       expect(e.message).to.equal("Not an OCFL repository.");
//     }
//   });
// });

// describe.skip("No directory to create a repo in", function() {
//   const repoPath = path.join(process.cwd(), "./test-data/ocflX");
//   const repository = new Repository({ ocflRoot: repoPath });
//   it("should test directory", async () => {
//     try {
//       const init = await repository.create();
//     } catch (e) {
//       assert.strictEqual(e.code, "ENOENT");
//     }
//   });
// });

// describe.skip("Successful repository creation", function() {
//   let repository;
//   const ocflVersion = "1.0";
//   beforeEach(async () => {
//     createDirectory(repositoryPath);
//     repository = new Repository({ ocflRoot: repositoryPath });
//     await repository.create();
//     return repository;
//   });
//   afterEach(async () => {
//     await fs.remove(repositoryPath);
//   });
//   it("should test content root", async function() {
//     assert.strictEqual(repository.ocflVersion, ocflVersion);
//   });
//   it("repo path is set", async function() {
//     assert.strictEqual(repository.ocflRoot, repositoryPath);
//   });
//   it("should have a namaste file", async function() {
//     assert.strictEqual(
//       fs.existsSync(path.join(repositoryPath, "0=ocfl_" + ocflVersion)),
//       true
//     );
//   });
//   it("should initialise in a directory with an existing namaste file", async function() {
//     const repository2 = new Repository({ ocflRoot: repositoryPath });
//     const init = await repository2.isRepository();
//     assert.strictEqual(repository2.ocflVersion, ocflVersion);
//   });
// });

// describe.skip("Adding objects from directories", function() {
//   const repeatedFileHash =
//     "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99";
//   const file1Hash =
//     "4dff4ea340f0a823f15d3f4f01ab62eae0e5da579ccb851f8db9dfe84c58b2b37b89903a740e1ee172da793a6e79d560e5f7f9bd058a12a280433ed6fa46510a";
//   const sepiaPicHash =
//     "577b1610764f4d9d05e82b5efe9b39214806e4c29249b59634699101a2a4679317388e78f7b40134aba8371cc684a9b422a7032d34a6785201051e484805bd59";
//   const sepiaPicPath = "v1/content/sample/pics/sepia_fence.jpg";
//   const sepiaPicLogicalPath = "sample/pics/sepia_fence.jpg";

//   let repository;
//   const ocflVersion = "1.0";
//   beforeEach(async () => {
//     createDirectory(repositoryPath);
//     repository = new Repository({ ocflRoot: repositoryPath });
//     await repository.create();
//     return repository;
//   });
//   afterEach(async () => {
//     await fs.remove(repositoryPath);
//   });

//   it("should make up an ID if you add content", async function() {
//     const obj = await repository.importNewObjectDir({
//       id: null,
//       sourceDir: sourcePath1
//     });
//     const inv = await obj.getLatestInventory();
//     const new_id = inv.id;
//     // We got a UUID as an an ID
//     assert.strictEqual(new_id.length, 36);
//     // Check  that the object is there
//     const objectPath = path.join(
//       repositoryPath,
//       new_id.replace(/(..)/g, "$1/")
//     );
//     assert.strictEqual(fs.existsSync(objectPath), true);
//   });

//   it("should use your id for a new object if you give it one", async function() {
//     const obj = await repository.importNewObjectDir({
//       id: "some_other_id",
//       sourceDir: sourcePath1
//     });
//     // We got a UUID as an an ID
//     const inv = await obj.getLatestInventory();
//     assert.strictEqual(inv.id, "some_other_id");
//     // Check  that the object is there
//     const objectPath = path.join(
//       repositoryPath,
//       inv.id.replace(/(..)/g, "$1/")
//     );
//     assert.strictEqual(fs.existsSync(objectPath), true);
//   });

//   // it.skip("should create a deposit directory in the repository path", async function() {
//   //   // OCFL objects are now responsible for creating paths
//   //   const repository = await createTestRepo();
//   //   const id = uuidv4();
//   //   const idpath = repository.objectIdToPath(id).replace(/\//g, "");
//   //   const epath = path.join(repository.path, "deposit", idpath);
//   //   const gpath = await repository.makeDepositPath(id);
//   //   expect(gpath).to.equal(epath);
//   //   expect(gpath).to.be.a.directory(`Created ${gpath}`).and.empty;
//   // });

//   it("should refuse to make an object if there is a failed attempt in the deposit dir", async function() {
//     try {
//       const depositDir = await fs.mkdirp(
//         path.join(repositoryPath, "deposit", "some_id")
//       );
//       const new_id = await repository.importNewObjectDir({
//         id: "some_id",
//         sourceDir: sourcePath1
//       });
//     } catch (e) {
//       assert.strictEqual(
//         e.message,
//         "There is already an object with this ID being deposited or left behind after a crash. Cannot proceed."
//       );
//     }
//   });

//   it("Should now have three objects in it", async function() {
//     const obj1 = await repository.importNewObjectDir({
//       id: "1",
//       sourceDir: sourcePath1
//     });
//     const obj2 = await repository.importNewObjectDir({
//       id: "2",
//       sourceDir: sourcePath1
//     });
//     const obj3 = await repository.importNewObjectDir({
//       id: "3",
//       sourceDir: sourcePath1
//     });

//     const objects = await repository.objects();
//     assert.strictEqual(objects.length, 3);

//     //TODO - Check Object IDs
//   });

//   // TODO: break this into smaller it()s and fix the 211 magic number bug

//   it("should handle file additions and export", async function() {
//     const obj1 = await repository.importNewObjectDir({
//       id: "1",
//       sourceDir: sourcePath1
//     });
//     const obj2 = await repository.importNewObjectDir({
//       id: "2",
//       sourceDir: sourcePath1
//     });
//     const obj3 = await repository.importNewObjectDir({
//       id: "3",
//       sourceDir: sourcePath1
//     });
//     // await repository.load();

//     fs.removeSync(sourcePath1_additional_files);
//     fs.copySync(sourcePath1, sourcePath1_additional_files);
//     // Add some identical additional files

//     // Add some new additional files
//     fs.writeFileSync(
//       path.join(sourcePath1_additional_files, "sample", "file1.txt"),
//       "$T)(*SKGJKVJS DFKJs"
//     );
//     fs.writeFileSync(
//       path.join(sourcePath1_additional_files, "sample", "file2.txt"),
//       "$T)(*SKGJKdfsfVJS DFKJs"
//     );

//     const test_id = "id";
//     await repository.importNewObjectDir({
//       id: test_id,
//       sourceDir: sourcePath1
//     });
//     const obj = await repository.importNewObjectDir({
//       id: test_id,
//       sourceDir: sourcePath1_additional_files
//     });

//     const inv3 = await obj.getLatestInventory();
//     const new_id = inv3.id;
//     assert.strictEqual(new_id, test_id);
//     // Check  that the object is there
//     // assert.strictEqual(fs.existsSync(objectPath), true);
//     // Check that it's v2
//     const object = new OcflObject({
//       ocflRoot: repositoryPath,
//       objectPath: new_id
//     });
//     await object.load();
//     const inv = await object.getLatestInventory();

//     assert.strictEqual(inv.versions["v2"].state[repeatedFileHash].length, 4);
//     assert.strictEqual(
//       inv.versions["v2"].state[repeatedFileHash].indexOf(
//         "sample/lots_of_little_files/file_0-copy1.txt"
//       ) > -1,
//       true
//     );

//     // Now delete some stuff
//     await fs.remove(path.join(sourcePath1_additional_files, "sample", "pics"));
//     // And re-import
//     await repository.importNewObjectDir({
//       id: test_id,
//       sourceDir: sourcePath1_additional_files
//     });

//     // Re-initialize exsiting object
//     const inv1 = await object.getLatestInventory();
//     //
//     assert.strictEqual(Object.keys(inv1.manifest).length, 207);
//     assert.strictEqual(inv1.manifest[sepiaPicHash][0], sepiaPicPath);
//     // Sepia pic is v2
//     assert.strictEqual(
//       inv1.versions["v2"].state[sepiaPicHash][0],
//       sepiaPicLogicalPath
//     );
//     // Not in v3
//     assert.strictEqual(inv1.versions["v3"].state[sepiaPicHash], undefined);

//     // Now put some stuff back
//     fs.copySync(
//       path.join(sourcePath1, "sample", "pics"),
//       path.join(sourcePath1_additional_files, "sample", "pics")
//     );
//     await repository.importNewObjectDir({
//       id: test_id,
//       sourceDir: sourcePath1_additional_files
//     });

//     const inv2 = await object.getLatestInventory();
//     assert.strictEqual(Object.keys(inv1.manifest).length, 207);
//     assert.strictEqual(inv2.manifest[sepiaPicHash][0], sepiaPicPath);
//     // Sepia pic is v2
//     assert.strictEqual(
//       inv2.versions["v4"].state[sepiaPicHash][0],
//       sepiaPicLogicalPath,
//       "no sepia pic in v4"
//     );
//     // Not in v3
//     assert.strictEqual(
//       inv2.versions["v3"].state[sepiaPicHash],
//       undefined,
//       "No sepia pic in v3"
//     );
//     // No content dirs in V3 or v4
//     assert.strictEqual(
//       fs.existsSync(path.join(object.path, "v3", "content")),
//       false
//     ),
//       "v3 has no content dir";
//     assert.strictEqual(
//       fs.existsSync(path.join(object.path, "v4", "content")),
//       false,
//       "v4 has no content dir"
//     );
//     // Tho v2 has one
//     assert.strictEqual(
//       fs.existsSync(path.join(object.path, "v2", "content")),
//       true,
//       "v2 has content dir"
//     );

//     const exportDirV4 = path.join("test-data", "exportv4");
//     const exportDirV5 = path.join("test-data", "exportv5");
//     const exportDirV1 = path.join("test-data", "exportv1");

//     await fs.remove(exportDirV1);
//     await fs.remove(exportDirV4);
//     await fs.remove(exportDirV5);

//     const testId = "1";

//     // try {
//     //   const init = await repository.export({
//     //     id: testId,
//     //     target: exportDirV4
//     //   });
//     // } catch (e) {
//     //   assert.strictEqual(
//     //     e.message,
//     //     "Can't export as the directory does not exist.",
//     //     "Export needs an empty directory to put stuff in."
//     //   );
//     // }

//     const fl = await fs.writeFile(exportDirV4, "");
//     try {
//       const init = await repository.export({
//         id: testId,
//         target: exportDirV4
//       });
//     } catch (e) {
//       assert.strictEqual(
//         e.message,
//         "That target is not useable. A non existent path or an empty folder is required."
//       );
//     }
//     await fs.remove(exportDirV4);

//     // await fs.mkdir(exportDirV4);
//     await repository.export({ id: testId, target: exportDirV4 });

//     expect(exportDirV4).to.be.a.directory();

//     // .and.deep.equal(
//     //   sourcePath1_additional_files,
//     //   "Matches the stuff that was imported",
//     //   "Exported v4 is the same as the thing we imported."
//     // );

//     try {
//       const init = await repository.export({
//         id: testId,
//         target: exportDirV4
//       });
//     } catch (e) {
//       assert.strictEqual(
//         e.message,
//         "That target is not useable. A non existent path or an empty folder is required."
//       );
//     }

//     await repository.export({
//       id: testId,
//       target: exportDirV1,
//       options: { version: "v1" }
//     });
//     expect(exportDirV1)
//       .to.be.a.directory()
//       .and.deep.equal(sourcePath1, "Matches the stuff that was imported");

//     // await fs.mkdir(exportDirV5);

//     return;
//     try {
//       await repository.export({
//         id: testId,
//         target: exportDirV5,
//         options: { version: "v5" }
//       });
//     } catch (e) {
//       // assert.strictEqual(
//       //   e.message,
//       //   "Can't export a version that doesn't exist.",
//       //   "Refuses to export non existent version"
//       // );
//     }
//     return;
//   });
// });

// // FIXME: a lot of this is duplicated from the directory import tests
// // and could be streamlined

// describe.skip("Adding objects with callbacks", async function() {
//   const CONTENT = {
//     "dir/file1.txt": "Contents of file1.txt",
//     "dir/file2.txt": "Contents of file2.txt",
//     "file3.txt": "Contents of file3.txt"
//   };

//   let repository;

//   beforeEach(async () => {
//     repository = await createTestRepo();
//   });

//   const makeContent = async dir => {
//     const files = Object.keys(CONTENT);
//     for (const f of files) {
//       const d = path.join(dir, path.dirname(f));
//       await fs.ensureDir(d);
//       await fs.writeFile(path.join(dir, f), CONTENT[f]);
//     }
//   };

//   it("can create an object with a callback", async function() {
//     const object = await repository.createNewObjectContent(
//       "some_id",
//       makeContent
//     );
//     assert.strictEqual(object.ocflVersion, "1.0");
//   });

//   it("Does not increment version number if you add the same thing twice", async function() {
//     await repository.createNewObjectContent("xx", makeContent);
//     const object = await repository.createNewObjectContent("xx", makeContent);
//     const inventory = await object.getInventory();
//     assert.strictEqual(inventory.head, "v1");
//   });

//   it("Does not let you use a subset of an existing id", async function() {
//     await repository.createNewObjectContent("aa", makeContent);
//     try {
//       const object = await repository.createNewObjectContent(
//         "aabb",
//         makeContent
//       );
//     } catch (e) {
//       assert.strictEqual(
//         e.message,
//         "A parent of this path seems to be an OCFL object and that's not allowed"
//       );
//     }
//   });

//   it("Does not let you use a superset of an existing id", async function() {
//     await repository.createNewObjectContent("cc", makeContent);
//     try {
//       await repository.createNewObjectContent("ccdd", makeContent);
//     } catch (e) {
//       assert.strictEqual(
//         e.message,
//         "A parent of this path seems to be an OCFL object and that's not allowed"
//       );
//     }
//   });

//   it("should make up an ID if you add content", async function() {
//     const obj = await repository.createNewObjectContent(null, makeContent);
//     const inv = await obj.getInventory();
//     const new_id = inv.id;
//     // We got a UUID as an an ID
//     assert.strictEqual(new_id.length, 36);
//     // Check  that the object is there
//     const objectPath = path.join(
//       repositoryPath,
//       new_id.replace(/(..)/g, "$1/")
//     );
//     assert.strictEqual(fs.existsSync(objectPath), true);
//   });

//   it("should use your id for a new object if you give it one", async function() {
//     const obj = await repository.createNewObjectContent(
//       "some_other_id",
//       makeContent
//     );
//     // We got a UUID as an an ID
//     const inv = await obj.getInventory();
//     assert.strictEqual(inv.id, "some_other_id");
//     // Check  that the object is there
//     const objectPath = path.join(
//       repositoryPath,
//       inv.id.replace(/(..)/g, "$1/")
//     );
//     assert.strictEqual(fs.existsSync(objectPath), true);
//   });

//   it("should have the content generated by the callback", async function() {
//     const obj = await repository.createNewObjectContent(
//       "some_other_id",
//       makeContent
//     );
//     const files = Object.keys(CONTENT);
//     for (const f of files) {
//       const ocflf = path.join(obj.path, "v1/content", f);
//       expect(ocflf)
//         .to.be.a.file(`${ocflf} is a file`)
//         .with.content(CONTENT[f]);
//     }
//   });

//   it("should have a manifest entry for each file with the correct hash", async function() {
//     const obj = await repository.createNewObjectContent(
//       "some_other_id",
//       makeContent
//     );
//     const files = Object.keys(CONTENT);
//     const inventory = await obj.getInventory();
//     const manifest = inventory.manifest;
//     for (const f of files) {
//       const ocflf = path.join(obj.path, "v1/content", f);
//       expect(ocflf)
//         .to.be.a.file(`${ocflf} is a file`)
//         .with.content(CONTENT[f]);
//       const h = await hasha.fromFile(ocflf, { algorithm: DIGEST_ALGORITHM });
//       expect(manifest[h][0]).to.equal(path.join("v1/content", f));
//       delete manifest[h];
//     }
//     expect(manifest).to.be.empty;
//   });
// });

// after(function() {
//   //TODO: destroy test repoPath
// });
