const assert = require("assert");
const path = require("path");
const fs = require("fs-extra");
const uuidv4 = require("uuidv4");
const pairtree = require("pairtree");
const hasha = require("hasha");
const Repository = require("../lib/repository");
const OcflObject = require("../lib/ocflObject");

const fileUtils = require('./fileUtils');

const chai = require("chai");

const expect = chai.expect;
chai.use(require("chai-fs"));

const DIGEST_ALGORITHM = "sha512";

function createDirectory(aPath) {
  if (!fs.existsSync(aPath)) {
    fs.mkdirSync(aPath);
  }
}

// Path constants
const repositoryPath = path.join(process.cwd(), "./test-data/ocfl1");
const sourcePath1 = path.join(process.cwd(), "./test-data/ocfl-object1-source");
const sourcePath1_additional_files = sourcePath1 + "_additional_files";

async function createTestRepo() {
  fs.removeSync(repositoryPath);
  createDirectory(repositoryPath);
  const repository = new Repository();
  const init = await repository.create(repositoryPath);
  return repository;
}


describe("repository initialisation", function() {
  it("should not initialise previous created or loaded repositories", async function() {
    const repository = await createTestRepo();
    try {
      const init = await repository.create(repositoryPath);
    } catch (e) {
      assert.strictEqual(
        e.message,
        "This repository has already been initialized."
      );
    }
  });

  it("should not initialise directories with files", async function() {
    const repository = new Repository();

    try {
      const init = await repository.create(".");
    } catch (e) {
      assert.strictEqual(
        e.message,
        "can't initialise a repository as there are already files."
      );
    }
  });

  it("Should not let you load twice", async function() {
    const repository = new Repository();
    try {
      const new_id = await repository.load(repositoryPath);
    } catch (e) {
      assert.strictEqual(
        e.message,
        "This repository has already been initialized."
      );
    }
  });
});

describe("No directory to create a repo in", function() {
  const repoPath = path.join(process.cwd(), "./test-data/ocflX");
  const repository = new Repository();
  it("should test directory", async function f() {
    try {
      const init = await repository.create(repoPath);
    } catch (e) {
      assert.strictEqual(e.code, "ENOENT");
    }
  });
});

describe("Successful repository creation", function() {
  const ocflVersion = "1.0";

  it("should test content root", async function() {
    const repository = await createTestRepo();
    assert.strictEqual(repository.ocflVersion, ocflVersion);
  });

  it("repo path is set", async function() {
    const repository = await createTestRepo();
    assert.strictEqual(repository.path, repositoryPath);
  });

  it("should have a namaste file", async function() {
    const repository = await createTestRepo();
    assert.strictEqual(
      fs.existsSync(path.join(repositoryPath, "0=ocfl_object_" + ocflVersion)),
      true
    );
  });

  const repository2 = new Repository();
  it("should initialise in a directory with an existing namaste file", async function() {
    const init = await repository2.load(repositoryPath);
    assert.strictEqual(repository2.ocflVersion, ocflVersion);
  });
});

describe("Adding objects from directories", function() {
  const repeatedFileHash =
    "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99";
  const file1Hash =
    "4dff4ea340f0a823f15d3f4f01ab62eae0e5da579ccb851f8db9dfe84c58b2b37b89903a740e1ee172da793a6e79d560e5f7f9bd058a12a280433ed6fa46510a";
  const sepiaPicHash =
    "577b1610764f4d9d05e82b5efe9b39214806e4c29249b59634699101a2a4679317388e78f7b40134aba8371cc684a9b422a7032d34a6785201051e484805bd59";
  const sepiaPicPath = "v1/content/sample/pics/sepia_fence.jpg";
  const sepiaPicLogicalPath = "sample/pics/sepia_fence.jpg";

  it("should make up an ID if you add content", async function() {
    const repository = await createTestRepo();
    const obj = await repository.importNewObjectDir(null, sourcePath1);
    const inv = await obj.getInventory();
    const new_id = inv.id;
    // We got a UUID as an an ID
    assert.strictEqual(new_id.length, 36);
    // Check  that the object is there
    const objectPath = path.join(
      repositoryPath,
      new_id.replace(/(..)/g, "$1/")
    );
    assert.strictEqual(fs.existsSync(objectPath), true);
  });

  it("should use your id for a new object if you give it one", async function() {
    const repository = await createTestRepo();
    const obj = await repository.importNewObjectDir(
      "some_other_id",
      sourcePath1
    );
    // We got a UUID as an an ID
    const inv = await obj.getInventory();
    assert.strictEqual(inv.id, "some_other_id");
    // Check  that the object is there
    const objectPath = path.join(
      repositoryPath,
      inv.id.replace(/(..)/g, "$1/")
    );
    assert.strictEqual(fs.existsSync(objectPath), true);
  });

  it("should create a deposit directory in the repository path", async function() {
    const repository = await createTestRepo();
    const id = uuidv4();
    const idpath = repository.objectIdToPath(id).replace(/\//g, "");
    const epath = path.join(repository.path, "deposit", idpath);
    const gpath = await repository.makeDepositPath(id);
    expect(gpath).to.equal(epath);
    expect(gpath).to.be.a.directory(`Created ${gpath}`).and.empty;
  });

  it("should refuse to make an object if there is a failed attempt in the deposit dir", async function() {
    const repository = await createTestRepo();
    try {
      const depositDir = await fs.mkdirp(
        path.join(repositoryPath, "deposit", "some_id")
      );
      const new_id = await repository.importNewObjectDir(
        "some_id",
        sourcePath1
      );
    } catch (e) {
      assert.strictEqual(
        e.message,
        "There is already an object with this ID being deposited or left behind after a crash. Cannot proceed."
      );
    }
  });

  it("Should now have three objects in it", async function() {
    const repository = await createTestRepo();
    const obj1 = await repository.importNewObjectDir("1", sourcePath1);
    const obj2 = await repository.importNewObjectDir("2", sourcePath1);
    const obj3 = await repository.importNewObjectDir("3", sourcePath1);

    const objects = await repository.objects();
    assert.strictEqual(objects.length, 3);

    //TODO - Check Object IDs
  });

  // TODO: break this into smaller it()s and fix the 211 magic number bug

  it("should handle file additions and export", async function() {
    this.timeout(10000);

    const repository = await createTestRepo();
    await repository.importNewObjectDir("1", sourcePath1);
    await repository.importNewObjectDir("2", sourcePath1);
    await repository.importNewObjectDir("3", sourcePath1);
    var objects = await repository.objects();
    // Three objects so far
    assert.strictEqual(objects.length, 3);
    
    fs.removeSync(sourcePath1_additional_files);
    fs.copySync(sourcePath1, sourcePath1_additional_files);
    // Add some identical additional files

    

    // ADD  a fourth opbject
    const test_id = "id";
    const object4 = await repository.importNewObjectDir(test_id, sourcePath1);
    const inv4 = await object4.getInventory();
    const uniqueFiles = await fileUtils.collectUniqueFiles(sourcePath1);

    expect(Object.keys(inv4.manifest)).to.have.members(Object.keys(uniqueFiles));


    var objects = await repository.objects();
    assert.strictEqual(objects.length, 4);

    // Add some new additional files to source path1
    fs.writeFileSync(
      path.join(sourcePath1_additional_files, "sample", "file1.txt"),
      "$T)(*SKGJKVJS DFKJs"
    );
    fs.writeFileSync(
      path.join(sourcePath1_additional_files, "sample", "file2.txt"),
      "$T)(*SKGJKdfsfVJS DFKJs"
    );

    // And re-import
    const obj = await repository.importNewObjectDir(
      test_id,
      sourcePath1_additional_files
    );
    const inv3 = await obj.getInventory();
    const new_id = inv3.id;
    assert.strictEqual(new_id, test_id);

    const uniqueFiles_additional = await fileUtils.collectUniqueFiles(sourcePath1_additional_files);

    expect(Object.keys(inv3.manifest)).to.have.members(Object.keys(uniqueFiles_additional));


    // Check  that the object is actuall there on disk
    const objectPath = path.join(
      repositoryPath,
      new_id.replace(/(..)/g, "$1/")
    );
    assert.strictEqual(fs.existsSync(objectPath), true);

    // Check that it's v2
    const object = new OcflObject();
    await object.load(objectPath);
    const inv = await object.getInventory();
    assert.strictEqual(inv.versions["v2"].state[repeatedFileHash].length, 4);
    assert.strictEqual(
      inv.versions["v2"].state[repeatedFileHash].indexOf(
        "sample/lots_of_little_files/file_0-copy1.txt"
      ) > -1,
      true
    );

    expect(Object.keys(inv.manifest)).to.have.members(Object.keys(uniqueFiles_additional));

    // Now delete some stuff
    await fs.remove(path.join(sourcePath1_additional_files, "sample", "pics"));

    // And re-import

    await repository.importNewObjectDir(test_id, sourcePath1_additional_files);


    // Re-initialize exsiting object
    const inv1 = await object.getInventory();
    //
    // the manifest should be the same as it was before the deletion, because
    // deleting a file doesn't remove it from the manifest

    expect(Object.keys(inv1.manifest)).to.have.members(Object.keys(uniqueFiles_additional));

    assert.strictEqual(inv1.manifest[sepiaPicHash][0], sepiaPicPath);
    // Sepia pic is v2
    assert.strictEqual(
      inv1.versions["v2"].state[sepiaPicHash][0],
      sepiaPicLogicalPath
    );
    // Not in v3
    assert.strictEqual(inv1.versions["v3"].state[sepiaPicHash], undefined);

    // Now put some stuff back
    fs.copySync(
      path.join(sourcePath1, "sample", "pics"),
      path.join(sourcePath1_additional_files, "sample", "pics")
    );

    // Note that these tests are passing, but bad, because they only work because
    // we put the same things back

    const uniqueFiles_reup = await fileUtils.collectUniqueFiles(sourcePath1_additional_files);

    await repository.importNewObjectDir(test_id, sourcePath1_additional_files);

    const inv2 = await object.getInventory();
    //assert.strictEqual(Object.keys(inv1.manifest).length, 211);
    expect(Object.keys(inv2.manifest)).to.have.members(Object.keys(uniqueFiles_reup));
    assert.strictEqual(inv2.manifest[sepiaPicHash][0], sepiaPicPath);
    // Sepia pic is v2
    assert.strictEqual(
      inv2.versions["v4"].state[sepiaPicHash][0],
      sepiaPicLogicalPath,
      "no sepia pic in v4"
    );
    // Not in v3
    assert.strictEqual(
      inv2.versions["v3"].state[sepiaPicHash],
      undefined,
      "No sepia pic in v3"
    );
    // No content dirs in V3 or v4
    assert.strictEqual(
      fs.existsSync(path.join(object.path, "v3", "content")),
      false
    ),
      "v3 has no content dir";
    assert.strictEqual(
      fs.existsSync(path.join(object.path, "v4", "content")),
      false,
      "v4 has no content dir"
    );
    // Tho v2 has one
    assert.strictEqual(
      fs.existsSync(path.join(object.path, "v2", "content")),
      true,
      "v2 has content dir"
    );

    const exportDirV4 = path.join("test-data", "exportv4");
    const exportDirV5 = path.join("test-data", "exportv5");
    const exportDirV1 = path.join("test-data", "exportv1");

    await fs.remove(exportDirV1);
    await fs.remove(exportDirV4);
    await fs.remove(exportDirV5);

    const testId = "id";

    try {
      const init = await repository.export(testId, exportDirV4);
    } catch (e) {
      assert.strictEqual(
        e.message,
        "Can't export as the directory does not exist.",
        "Export needs an empty directory to put stuff in."
      );
    }

    const fl = await fs.writeFile(exportDirV4, "");
    try {
      const init = await repository.export(testId, exportDirV4);
    } catch (e) {
      assert.strictEqual(
        e.message,
        "Can't export to an existing file.",
        "Cannot export over the top of a file"
      );
    }
    await fs.remove(exportDirV4);

    await fs.mkdir(exportDirV4);
    await repository.export(testId, exportDirV4);

    expect(exportDirV4)
      .to.be.a.directory()
      .and.deep.equal(
        sourcePath1_additional_files,
        "Matches the stuff that was imported",
        "Exported v4 is the same as the thing we imported."
      );

    try {
      const init = await repository.export(testId, exportDirV4);
    } catch (e) {
      assert.strictEqual(
        e.message,
        "Can't export as the directory has stuff in it.",
        "Will not export to a directory that has existing content."
      );
    }

    await fs.mkdir(exportDirV1);
    await repository.export(testId, exportDirV1, { version: "v1" });
    expect(exportDirV1)
      .to.be.a.directory()
      .and.deep.equal(sourcePath1, "Matches the stuff that was imported");

    await fs.mkdir(exportDirV5);

    try {
      await repository.export(testId, exportDirV5, { version: "v5" });
    } catch (e) {
      assert.strictEqual(
        e.message,
        "Can't export a version that doesn't exist.",
        "Refuses to export non existent version"
      );
    }
   
  });
});

// FIXME: a lot of this is duplicated from the directory import tests
// and could be streamlined

describe("Adding objects with callbacks", async function() {
  const CONTENT = {
    "dir/file1.txt": "Contents of file1.txt",
    "dir/file2.txt": "Contents of file2.txt",
    "file3.txt": "Contents of file3.txt"
  };

  let repository;

  beforeEach(async () => {
    repository = await createTestRepo();
  });

  const makeContent = async dir => {
    const files = Object.keys(CONTENT);
    for (const f of files) {
      const d = path.join(dir, path.dirname(f));
      await fs.ensureDir(d);
      await fs.writeFile(path.join(dir, f), CONTENT[f]);
    }
  };

  it("can create an object with a callback", async function() {
    const object = await repository.createNewObjectContent(
      "some_id",
      makeContent
    );
    assert.strictEqual(object.ocflVersion, "1.0");
  });

  it("Does not increment version number if you add the same thing twice", async function() {
    await repository.createNewObjectContent("xx", makeContent);
    const object = await repository.createNewObjectContent("xx", makeContent);
    const inventory = await object.getInventory();
    assert.strictEqual(inventory.head, "v1");
  });

  it('Can fetch an object', async function () {
    const repository = await createTestRepo();
    await repository.createNewObjectContent("xx", makeContent);
    const object = await repository.getObject("xx");
    const inventory = await object.getInventory();
    assert.strictEqual(inventory.head, 'v1');
  });

  it('Can not fetch an object that does not exist', async function () {
    const repository = await createTestRepo();
    const object = await repository.getObject("xx");
    assert.strictEqual(object, null);
  });

  it('Does not let you use a subset of an existing id', async function () {
    const repository = await createTestRepo();
    await repository.createNewObjectContent("aaaa", makeContent);
    try {
      const object = await repository.createNewObjectContent(
        "aabb",
        makeContent
      );
    } catch (e) {
      assert.strictEqual(
        e.message,
        "A parent of this path seems to be an OCFL object and that's not allowed"
      );
    }
  });

  it("Does not let you use a superset of an existing id", async function() {
    await repository.createNewObjectContent("cc", makeContent);
    try {
      await repository.createNewObjectContent("ccdd", makeContent);
    } catch (e) {
      assert.strictEqual(
        e.message,
        "A parent of this path seems to be an OCFL object and that's not allowed"
      );
    }
  });

  it("should make up an ID if you add content", async function() {
    const obj = await repository.createNewObjectContent(null, makeContent);
    const inv = await obj.getInventory();
    const new_id = inv.id;
    // We got a UUID as an an ID
    assert.strictEqual(new_id.length, 36);
    // Check  that the object is there
    const objectPath = path.join(
      repositoryPath,
      new_id.replace(/(..)/g, "$1/")
    );
    assert.strictEqual(fs.existsSync(objectPath), true);
  });

  it("should use your id for a new object if you give it one", async function() {
    const obj = await repository.createNewObjectContent(
      "some_other_id",
      makeContent
    );
    // We got a UUID as an an ID
    const inv = await obj.getInventory();
    assert.strictEqual(inv.id, "some_other_id");
    // Check  that the object is there
    const objectPath = path.join(
      repositoryPath,
      inv.id.replace(/(..)/g, "$1/")
    );
    assert.strictEqual(fs.existsSync(objectPath), true);
  });

  it("should have the content generated by the callback", async function() {
    const obj = await repository.createNewObjectContent(
      "some_other_id",
      makeContent
    );
    const files = Object.keys(CONTENT);
    for (const f of files) {
      const ocflf = path.join(obj.path, "v1/content", f);
      expect(ocflf)
        .to.be.a.file(`${ocflf} is a file`)
        .with.content(CONTENT[f]);
    }
  });

  it("should have a manifest entry for each file with the correct hash", async function() {
    const obj = await repository.createNewObjectContent(
      "some_other_id",
      makeContent
    );
    const files = Object.keys(CONTENT);
    const inventory = await obj.getInventory();
    const manifest = inventory.manifest;
    for (const f of files) {
      const ocflf = path.join(obj.path, "v1/content", f);
      expect(ocflf)
        .to.be.a.file(`${ocflf} is a file`)
        .with.content(CONTENT[f]);
      const h = await hasha.fromFile(ocflf, { algorithm: DIGEST_ALGORITHM });
      expect(manifest[h][0]).to.equal(path.join("v1/content", f));
      delete manifest[h];
    }
    expect(manifest).to.be.empty;
  });
});

after(function() {
  //TODO: destroy test repoPath
});
