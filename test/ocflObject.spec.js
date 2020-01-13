const assert = require("assert");
const path = require("path");
const fs = require("fs-extra");
const hasha = require("hasha");
const OcflObject = require("../lib/ocflObject");
const _ = require("lodash");
const pairtree = require("pairtree");

const DIGEST_ALGORITHM = "sha512";

const chai = require("chai");
const expect = chai.expect;
chai.use(require("chai-fs"));

describe("Testing object creation functionality", async () => {
  let object;
  const ocflRoot = "test-output";
  const id = "1";
  const source = "./test-data/simple-ocfl-object";
  beforeEach(async () => {
    object = new OcflObject({ ocflRoot, id });
  });

  afterEach(async () => {
    await fs.remove(path.join(source, "file1.txt"));
    await fs.remove(path.join(source, "file2.txt"));
    await fs.remove("test-output");
  });
  it("should be able to create an object with one version", async () => {
    // v1 create object and import folder
    await object.update({ source });

    let inventory = await object.getLatestInventory();
    // console.log(inventory);
    expect(inventory.head).to.equal("v1");
    expect(Object.keys(inventory.versions).length).to.equal(1);
    expect(inventory.manifest).to.deep.equal({
      "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99": [
        "v1/content/sample/file_0.txt"
      ]
    });
  });
  it(`should fail to create an object because there's already one in deposit`, async () => {
    await fs.mkdirp(path.join(ocflRoot, "deposit", id));
    try {
      await object.update({ source });
    } catch (error) {
      expect(error.message).to.equal(
        "An object with that ID is already in the deposit path."
      );
    }
  });
  it(`should be able to create an object given a path`, async () => {
    const objectPath = "/xx/yy/zz";
    object = new OcflObject({ ocflRoot, objectPath });
    await object.update({ source });
    await object.load();
    const inventory = await object.getLatestInventory();
    expect(inventory.id).to.equal(objectPath);
  });
  it(`should fail to create an object as a child of another`, async () => {
    let objectPath = "/xx/yy";
    object = new OcflObject({ ocflRoot, objectPath });
    await object.update({ source });

    objectPath = "/xx/yy/zz";
    object = new OcflObject({ ocflRoot, objectPath });
    try {
      await object.update({ source });
    } catch (error) {
      expect(error.message).to.equal(
        `This object is a child of an existing object and that's not allowed.`
      );
    }
  });
  it(`should be able to load an object from a path`, async () => {
    const id = "xxyyzz";
    object = new OcflObject({ ocflRoot, id });
    await object.update({ source });
    await object.load();
    const inventory = await object.getLatestInventory();
    expect(inventory.manifest).to.deep.equal({
      "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99": [
        "v1/content/sample/file_0.txt"
      ]
    });
  });
  it("should be able to create an object with two versions by adding a file", async () => {
    await object.update({ source });

    // v2 add a file
    fs.writeFileSync(path.join(source, "file1.txt"), "$T)(*SKGJKVJS DFKJs");
    await object.update({ source });

    let inventory = await object.getLatestInventory();
    // console.log(inventory);
    expect(inventory.head).to.equal("v2");
    expect(Object.keys(inventory.versions).length).to.equal(2);
    expect(inventory.manifest).to.deep.equal({
      de01d675497715d6e139c1182eeb4e9c73cfe25df4f1006a8e75679910c7b897707591bd574f27f21c50a6f624e737284c5271431302afa0bac8b66a342e3617: [
        "v2/content/file1.txt"
      ],
      "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99": [
        "v1/content/sample/file_0.txt"
      ]
    });
  });
  it("should be able to create an object with three versions by adding another file", async () => {
    // v1
    let result;
    object = await object.update({ source });

    // v2 add a file
    fs.writeFileSync(path.join(source, "file1.txt"), "$T)(*SKGJKVJS DFKJs");
    object = await object.update({ source });

    // v3 add another file
    fs.writeFileSync(
      path.join(source, "file2.txt"),
      "fsf v$T)(*SKGJKVJS DFKJs"
    );
    object = await object.update({ source });

    let inventory = await object.getLatestInventory();
    // console.log(inventory);
    expect(inventory.head).to.equal("v3");
    expect(Object.keys(inventory.versions).length).to.equal(3);
  });
  it("should be able to create an object with four versions by changing an existing file", async () => {
    await object.update({ source });

    // v2 add a file
    fs.writeFileSync(path.join(source, "file1.txt"), "$T)(*SKGJKVJS DFKJs");
    await object.update({ source });

    // v3 add another file
    fs.writeFileSync(
      path.join(source, "file2.txt"),
      "fsf v$T)(*SKGJKVJS DFKJs"
    );
    await object.update({ source });

    // v4 change the content of a file
    fs.writeFileSync(
      path.join(source, "file1.txt"),
      "fsf v$T)(*SKGJKVJS DFKJs"
    );
    await object.update({ source });

    let inventory = await object.getLatestInventory();
    // console.log(inventory);
    expect(inventory.head).to.equal("v4");
    expect(Object.keys(inventory.versions).length).to.equal(4);
    expect(inventory.manifest).to.deep.equal({
      ea832e64995b2a7d64358abe682e9c0abfb015d22278a78ac17cb2d0a0ac2f9dfc02f5fb2e6baf37a77480a5be0b32957d0e9f979a77403ffb70a8dae1e319d8: [
        "v4/content/file1.txt",
        "v3/content/file2.txt"
      ],
      "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99": [
        "v1/content/sample/file_0.txt"
      ]
    });
  });
  it("should be able to create an object with five versions by removing an existing file", async () => {
    // v1
    await object.update({ source });

    // v2 add a file
    await fs.writeFile(path.join(source, "file1.txt"), "$T)(*SKGJKVJS DFKJs");
    await object.update({ source });

    // v3 add another file
    await fs.writeFile(
      path.join(source, "file2.txt"),
      "fsf v$T)(*SKGJKVJS DFKJs"
    );
    await object.update({ source });

    await // v4 change the content of a file
    await fs.writeFile(
      path.join(source, "file1.txt"),
      "fsf v$T)(*SKGJKVJS DFKJs"
    );
    await object.update({ source });

    // v5 remove a file
    await fs.remove(path.join(source, "file2.txt"));
    await object.update({ source });

    let inventory = await object.getLatestInventory();
    // console.log(inventory);
    expect(inventory.head).to.equal("v5");
    expect(Object.keys(inventory.versions).length).to.equal(5);
    expect(inventory.manifest).to.deep.equal({
      ea832e64995b2a7d64358abe682e9c0abfb015d22278a78ac17cb2d0a0ac2f9dfc02f5fb2e6baf37a77480a5be0b32957d0e9f979a77403ffb70a8dae1e319d8: [
        "v4/content/file1.txt"
      ],
      "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99": [
        "v1/content/sample/file_0.txt"
      ]
    });
  });
  it("should remain at one version when there is no change to the source", async () => {
    await object.update({ source });
    await object.update({ source });
    await object.update({ source });

    let inventory = await object.getLatestInventory();
    // console.log(inventory);
    expect(inventory.head).to.equal("v1");
    expect(Object.keys(inventory.versions).length).to.equal(1);
    expect(inventory.manifest).to.deep.equal({
      "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99": [
        "v1/content/sample/file_0.txt"
      ]
    });
  });
  it("should be able to create an object with a callback to write the content", async () => {
    await object.update({ writer: writeContent });

    let inventory = await object.getLatestInventory();
    // console.log(inventory);
    expect(inventory.head).to.equal("v1");
    expect(Object.keys(inventory.versions).length).to.equal(1);
    expect(inventory.manifest).to.deep.equal({
      "3abea15c00b706b25bd01ef29bfbe4fc117bb3464d0ba178bb2d924d71b758dd660dbef464e896ad4ec86e4bb498a7b58abb11b958875c468193cc42995b249e": [
        "v1/content/dir/fileX.txt"
      ],
      "9fb7cdf68ceaa2425e9e8f761e6b89c95250f63ae014c757436760caf9c28b2b368a173b340616ccbba0377c0c724a2d67a6c968a3b91968f72a8ed0da95e6cf": [
        "v1/content/fileY.txt"
      ]
    });
  });
  it("should handle an object being written with a source folder and a callback", async () => {
    // v1 - load a source folder
    await object.update({ source });

    // v2 - write some content via a callback
    await object.update({ writer: writeContent });

    inventory = await object.getLatestInventory();
    // console.log(inventory);
    expect(inventory.head).to.equal("v2");
    expect(Object.keys(inventory.versions).length).to.equal(2);
    expect(inventory.manifest).to.deep.equal({
      "3abea15c00b706b25bd01ef29bfbe4fc117bb3464d0ba178bb2d924d71b758dd660dbef464e896ad4ec86e4bb498a7b58abb11b958875c468193cc42995b249e": [
        "v2/content/dir/fileX.txt"
      ],
      "9fb7cdf68ceaa2425e9e8f761e6b89c95250f63ae014c757436760caf9c28b2b368a173b340616ccbba0377c0c724a2d67a6c968a3b91968f72a8ed0da95e6cf": [
        "v2/content/fileY.txt"
      ]
    });
  });
  it("should object to both source and writer being defined", async () => {
    try {
      await object.update({ source, writer: () => {} });
    } catch (error) {
      expect(error.message).to.equal(
        "Specify only one of source or writer - not both."
      );
    }
  });
  it("should object because neither source nor writer is defined", async () => {
    try {
      await object.update({});
    } catch (error) {
      expect(error.message).to.equal(
        "Specify at least one of source or writer."
      );
    }
  });
  it(`should not be able to export - target folder doesn't exist`, async () => {
    // v1 create object and import folder
    await object.update({ source });
    try {
      await object.export({ target: "./notfolder" });
    } catch (error) {
      expect(error.message).to.equal(`Export target folder doesn't exist.`);
    }
  });
  it(`should not be able to export - target folder not empty`, async () => {
    // v1 create object and import folder
    await object.update({ source });
    try {
      await object.export({ target: "./test-data" });
    } catch (error) {
      expect(error.message).to.equal(`Export target folder isn't empty.`);
    }
  });
  it("should be able to export an object with one version - automatically select head", async () => {
    const exportFolder = "./test-export";
    await object.update({ source });
    await fs.mkdirp(exportFolder);
    await object.export({ target: "./test-export" });
    let content = await fs.readdir(exportFolder);
    expect(content).to.deep.equal(["sample"]);
    content = await fs.readdir(path.join(exportFolder, "sample"));
    expect(content).to.deep.equal(["file_0.txt"]);
    await fs.remove(exportFolder);
  });
  it("should be able to export an object with one version - select v1", async () => {
    const exportFolder = "./test-export";
    await object.update({ source });
    await fs.mkdirp(exportFolder);
    await object.export({ target: "./test-export", version: "v1" });

    let content = await fs.readdir(exportFolder);
    expect(content).to.deep.equal(["sample"]);
    content = await fs.readdir(path.join(exportFolder, "sample"));
    expect(content).to.deep.equal(["file_0.txt"]);
    await fs.remove(exportFolder);
  });
  it("should be able to export a version from an object with two versions - select v1", async () => {
    const exportFolder = "./test-export";

    // v1
    await object.update({ source });

    // v2 add a file
    fs.writeFileSync(path.join(source, "file1.txt"), "$T)(*SKGJKVJS DFKJs");
    await object.update({ source });

    // export
    await fs.mkdirp(exportFolder);
    await object.export({ target: "./test-export", version: "v1" });

    let content = await fs.readdir(exportFolder);
    expect(content).to.deep.equal(["sample"]);
    content = await fs.readdir(path.join(exportFolder, "sample"));
    expect(content).to.deep.equal(["file_0.txt"]);
    await fs.remove(exportFolder);
  });
  it("should be able to export a version from an object with two versions - select v2", async () => {
    const exportFolder = "./test-export";

    // v1
    await object.update({ source });

    // v2 add a file
    fs.writeFileSync(path.join(source, "file1.txt"), "$T)(*SKGJKVJS DFKJs");
    await object.update({ source });

    // export
    await fs.mkdirp(exportFolder);
    await object.export({ target: "./test-export", version: "v2" });

    let content = await fs.readdir(exportFolder);
    expect(content).to.deep.equal(["file1.txt", "sample"]);
    content = await fs.readdir(path.join(exportFolder, "sample"));
    expect(content).to.deep.equal(["file_0.txt"]);
    await fs.remove(exportFolder);
  });

  async function writeContent({ target }) {
    const CONTENT = {
      "dir/fileX.txt": "Contents of fileX.txt",
      "fileY.txt": "Contents of fileY.txt"
    };
    const files = Object.keys(CONTENT);
    for (const f of files) {
      const d = path.join(target, path.dirname(f));
      await fs.ensureDir(d);
      await fs.writeFile(path.join(target, f), CONTENT[f]);
    }
  }
});

describe("Testing object manipulation functionality - object with one version", async () => {
  let object, source;
  beforeEach(async () => {
    source = "./test-data/simple-ocfl-object";
    object = new OcflObject({ ocflRoot: "test-output", id: "2" });
  });
  afterEach(async () => {
    await fs.remove(path.join(source, "file1.txt"));
    await fs.remove(path.join(source, "file2.txt"));
    await fs.remove("test-output");
  });
  it("should be able to get the latest inventory", async () => {
    // v1 create object and import folder
    await object.update({ source });
    await object.load();
    const inventory = await object.getLatestInventory();
    expect(inventory.head).to.equal("v1");
  });
  it("should be able to get the v1 inventory", async () => {
    // v1 create object and import folder
    await object.update({ source });
    await object.load();
    const inventory = await object.getInventory({ version: "v1" });
    expect(inventory.head).to.equal("v1");
  });
  it("should be able to get the versions from an object with one version", async () => {
    // v1 create object and import folder
    await object.update({ source });
    await object.load();

    let versions = await object.getVersions();
    expect(versions.length).to.equal(1);
    expect(versions[0].version).to.equal("v1");
  });
  it(`should be able to see if it's an OCFL object`, async () => {
    let isObject = await object.isObject();
    expect(isObject).to.be.false;

    // v1 create object and import folder
    await object.update({ source });

    isObject = await object.isObject();
    expect(isObject).to.be.true;
  });
  it(`should be able to see if it's available`, async () => {
    let isAvailable = await object.isAvailable();
    expect(isAvailable).to.be.true;

    // v1 create object and import folder
    await object.update({ source });

    isAvailable = await object.isAvailable();
    expect(isAvailable).to.be.false;
  });
  it("should be able to get the state from an object with one version", async () => {
    // v1 create object and import folder
    await object.update({ source });
    await object.load();

    let versions = await object.getVersions();
    expect(versions.length).to.equal(1);
    expect(versions[0].version).to.equal("v1");

    let content = await object.getVersion({ version: "v1" });
    expect(content.version).to.equal("v1");
    expect(content.state).to.deep.equal({
      "file_0.txt": [
        {
          name: "file_0.txt",
          path: "v1/content/sample/file_0.txt",
          hash:
            "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99",
          version: 1
        }
      ]
    });
  });
  it("should be able to get the latest state from an object with one version", async () => {
    // v1 create object and import folder
    await object.update({ source });
    await object.load();

    let versions = await object.getVersions();
    expect(versions.length).to.equal(1);
    expect(versions[0].version).to.equal("v1");

    let content = await object.getLatestVersion();
    expect(content.version).to.equal("v1");
    expect(content.state).to.deep.equal({
      "file_0.txt": [
        {
          name: "file_0.txt",
          path: "v1/content/sample/file_0.txt",
          hash:
            "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99",
          version: 1
        }
      ]
    });
  });
  it("should be able to get all states from an object with one version", async () => {
    // v1 create object and import folder
    await object.update({ source });
    await object.load();

    let versions = await object.getVersions();
    expect(versions.length).to.equal(1);
    expect(versions[0].version).to.equal("v1");

    let content = await object.getAllVersions();
    expect(content.length).to.equal(1);
    content = content.pop();
    expect(content.version).to.equal("v1");
    expect(content.state).to.deep.equal({
      "file_0.txt": [
        {
          name: "file_0.txt",
          path: "v1/content/sample/file_0.txt",
          hash:
            "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99",
          version: 1
        }
      ]
    });
  });
  it("should be able to remove an object from the repository", async () => {
    await object.update({ source });
    let isObject = await object.isObject();
    expect(isObject).to.be.true;
    const result = await object.remove();
    expect(result).to.be.null;

    isObject = await object.isObject();
    expect(isObject).to.be.false;

    isAvailable = await object.isAvailable();
    expect(isAvailable).to.be.true;
  });
  it(`should be able to resolve a file path relative to the object`, async () => {
    // v1 create object and import folder
    await object.update({ source });
    await object.load();

    let version = await object.getLatestVersion();

    let file = version.state["file_0.txt"].pop();
    file = object.resolveFilePath({ filePath: file.path });
    expect(file).to.equal("test-output/2/v1/content/sample/file_0.txt");
  });
});

describe("Testing object manipulation functionality - object with three versions", async () => {
  let object, source;
  beforeEach(async () => {
    source = "./test-data/simple-ocfl-object";
    object = new OcflObject({ ocflRoot: "test-output", id: "3" });
    // v1
    await object.update({ source });

    // v2 add a file
    fs.writeFileSync(path.join(source, "file1.txt"), "$T)(*SKGJKVJS DFKJs");
    await object.update({ source });

    // v3 add another file
    fs.writeFileSync(
      path.join(source, "file2.txt"),
      "fsf v$T)(*SKGJKVJS DFKJs"
    );
    await object.update({ source });

    await object.load();
  });
  afterEach(async () => {
    await fs.remove(path.join(source, "file1.txt"));
    await fs.remove(path.join(source, "file2.txt"));
    await fs.remove("test-output");
  });
  it("should be able to get the latest inventory", async () => {
    // v1 create object and import folder
    await object.update({ source });
    await object.load();
    const inventory = await object.getLatestInventory();
    expect(inventory.head).to.equal("v3");
  });
  it("should be able to get the v1 inventory", async () => {
    // v1 create object and import folder
    await object.update({ source });
    await object.load();
    const inventory = await object.getInventory({ version: "v1" });
    expect(inventory.head).to.equal("v1");
  });
  it("should be able to get the versions from an object with three versions", async () => {
    let versions = await object.getVersions();
    expect(versions.length).to.equal(3);
    expect(versions.pop().version).to.equal("v3");
  });
  it("should be able to get the v1 state from an object with three versions", async () => {
    let content = await object.getVersion({ version: "v1" });
    expect(content.version).to.equal("v1");
    expect(content.state).to.deep.equal({
      "file_0.txt": [
        {
          name: "file_0.txt",
          path: "v1/content/sample/file_0.txt",
          hash:
            "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99",
          version: 1
        }
      ]
    });
  });
  it("should be able to get the latest state from an object with one version", async () => {
    let content = await object.getLatestVersion();
    expect(content.version).to.equal("v3");
    expect(content.state).to.deep.equal({
      "file1.txt": [
        {
          name: "file1.txt",
          path: "v2/content/file1.txt",
          hash:
            "de01d675497715d6e139c1182eeb4e9c73cfe25df4f1006a8e75679910c7b897707591bd574f27f21c50a6f624e737284c5271431302afa0bac8b66a342e3617",
          version: 2
        }
      ],
      "file2.txt": [
        {
          name: "file2.txt",
          path: "v3/content/file2.txt",
          hash:
            "ea832e64995b2a7d64358abe682e9c0abfb015d22278a78ac17cb2d0a0ac2f9dfc02f5fb2e6baf37a77480a5be0b32957d0e9f979a77403ffb70a8dae1e319d8",
          version: 3
        }
      ],
      "file_0.txt": [
        {
          name: "file_0.txt",
          path: "v1/content/sample/file_0.txt",
          hash:
            "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99",
          version: 1
        }
      ]
    });
  });
  it("should be able to get all states from an object with one version", async () => {
    let versions = await object.getVersions();

    let content = await object.getAllVersions();
    expect(content.length).to.equal(3);
    const state1 = content.shift();
    expect(state1.version).to.equal("v1");
    expect(state1.state).to.deep.equal({
      "file_0.txt": [
        {
          name: "file_0.txt",
          path: "v1/content/sample/file_0.txt",
          hash:
            "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99",
          version: 1
        }
      ]
    });

    const state2 = content.shift();
    expect(state2.version).to.equal("v2");
    expect(state2.state).to.deep.equal({
      "file1.txt": [
        {
          name: "file1.txt",
          path: "v2/content/file1.txt",
          hash:
            "de01d675497715d6e139c1182eeb4e9c73cfe25df4f1006a8e75679910c7b897707591bd574f27f21c50a6f624e737284c5271431302afa0bac8b66a342e3617",
          version: 2
        }
      ],
      "file_0.txt": [
        {
          name: "file_0.txt",
          path: "v1/content/sample/file_0.txt",
          hash:
            "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99",
          version: 1
        }
      ]
    });
  });
});

// function createDirectory(aPath) {
//   if (fs.existsSync(aPath)) {
//     fs.removeSync(aPath);
//   }
//   fs.mkdirSync(aPath);
// }

// describe.skip("object init", function() {
//   describe("no dir", function() {
//     const objPath = path.join(process.cwd(), "./test-data/ocfl_obj_test");
//     // const object = new OcflObject({ ocflRoot: objPath, id: "xx" });
//     it("should test directory", async function f() {
//       try {
//         const init = await object.create();
//       } catch (e) {
//         assert.strictEqual(e.code, "ENOENT");
//       }
//     });
//   });

//   describe("no init", function() {
//     const objPath = path.join(process.cwd(), "./test-data/notocfl");
//     // const object = new OcflObject({ ocflRoot: objPath, id: "xx" });
//     it("should not create an object in directories with files", async function() {
//       try {
//         const init = await object.create(objPath);
//       } catch (e) {
//         assert.strictEqual(
//           e.message,
//           "can't initialise an object here as there are already files"
//         );
//       }
//     });
//   });
// });

// describe.skip("object init 2", function() {
//   const objectPath = path.join(process.cwd(), "./test-data/ocfl-object");
//   const objectId = "1";
//   let object;

//   beforeEach(async () => {
//     object = new OcflObject({ ocflRoot: objectPath, id: objectId });
//     await object.create();
//   });

//   it("should test content root", async function() {
//     assert.strictEqual(object.ocflVersion, "1.0");
//   });
//   it("should have a path", function() {
//     assert.strictEqual(object.path, path.join(objectPath, objectId, "/"));
//   });
//   it("should have a namaste file", function() {
//     assert.strictEqual(
//       fs.existsSync(path.join(objectPath, objectId, "0=ocfl_object_1.0")),
//       true
//     );
//   });

//   it("should be version 0", function() {
//     assert.strictEqual(object.contentVersion, null);
//   });

//   // it("Should let you access an existing (on disk) object", async function() {
//   //   const object2 = new OcflObject({ ocflRoot: objectPath, id: objectId });
//   //   const init = await object2.load();
//   // });
// });

// const objectPath1 = path.join(process.cwd(), "./test-data/ocfl-object1");

// describe.skip("version numbering", function() {
//   //Helper functions
//   // const object = new OcflObject({});

//   it("should know how to increment versions", function() {
//     assert.strictEqual("v1", object.getVersionString(1));
//     assert.strictEqual("v100", object.getVersionString(100));
//   });
//   //Can tell what version of content is in a repository
// });

// describe.skip("object with content imported from an existing directory", async function() {
//   const objectPath1 = path.join(process.cwd(), "./test-data/ocfl-object1");
//   const inventoryPath1_v1 = path.join(objectPath1, "v1", "inventory.json");
//   const repeatedFileHash =
//     "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99";
//   const file1Hash =
//     "4dff4ea340f0a823f15d3f4f01ab62eae0e5da579ccb851f8db9dfe84c58b2b37b89903a740e1ee172da793a6e79d560e5f7f9bd058a12a280433ed6fa46510a";
//   const id = "some_id";
//   const sourcePath1 = path.join(
//     process.cwd(),
//     "./test-data/ocfl-object1-source"
//   );

//   let object, objectPath;
//   beforeEach(async () => {
//     createDirectory(objectPath1);
//     object = new OcflObject({ ocflRoot: objectPath1, id });
//     objectPath = path.join(objectPath1, pairtree.path(id));
//     await object.create();
//     await object.importDir({ id, source: sourcePath1 });
//     await object.load();
//   });

//   afterEach(async function() {
//     await fs.remove(objectPath1);
//   });

//   it("can create an object by importing an existing directory", async function() {
//     assert.strictEqual(object.ocflVersion, "1.0");
//   });

//   it("should be at the expected path", function() {
//     assert.strictEqual(object.path, objectPath);
//   });

//   it("should have a namaste file", function() {
//     //create this test path
//     assert.strictEqual(
//       fs.existsSync(path.join(objectPath, "0=ocfl_object_1.0")),
//       true
//     );
//   });

//   it("should have a v1 dir", async function() {
//     //create this test path
//     expect(path.join(objectPath, "v1")).to.be.a.directory("v1 dir");
//   });

//   it("should be version 1", async function() {
//     assert.strictEqual(object.contentVersion, "v1");
//   });

//   it("should have a v1/content dir", function() {
//     const contentPath = path.join(objectPath, "v1", "content");
//     expect(contentPath).to.be.a.directory("v1/content dir");
//   });

//   it("should have a manifest (inventory)", function() {
//     //create this test path
//     const inventoryPath1 = path.join(objectPath, "inventory.json");
//     expect(inventoryPath1).to.be.a.file("inventory.json is a file");
//   });

//   it("object has same directory structure as source", function() {
//     const contentPath = path.join(objectPath, "v1", "content");
//     expect(contentPath)
//       .to.to.be.a.directory()
//       .and.deep.equal(
//         sourcePath1,
//         "ocfl content has original directory structure"
//       );
//   });

//   it("has copied all the contents of the source to the object", function() {
//     const contentPath = path.join(objectPath, "v1", "content");
//     expect(sourcePath1)
//       .to.be.a.directory("is a dir")
//       .with.deep.files.that.satisfy(files => {
//         return files.every(file => {
//           const fixture_file = path.join(sourcePath1, file);
//           const output_file = path.join(contentPath, file);
//           expect(output_file)
//             .to.be.a.file(`file ${output_file}`)
//             .and.equal(fixture_file, `${output_file} content matches`);
//           return true;
//         });
//       });
//   });

//   it("should be able to load an object", async () => {
//     expect(object.versions.length).to.equal(1);
//     expect(object.versions[0].version).to.equal("v1");
//   });

//   it("should be able to get a specific version inventory", async () => {
//     const versionInventory = await object.getVersion({ version: "v1" });
//     expect(versionInventory.version).to.equal("v1");
//     expect(Object.keys(versionInventory.state)).to.deep.equal([
//       "CATALOG.json",
//       "file_0.txt",
//       "file_1.txt",
//       "file_2.txt",
//       "2017-06-11 12.56.14.jpg",
//       "sepia_fence.jpg",
//       "2017-06-11 12.56.14.png",
//       "sepia_fence.png"
//     ]);
//   });

//   it("should be able to get the latest version inventory - only one version", async () => {
//     const versionInventory = await object.getVersion({ version: "latest" });
//     expect(versionInventory.version).to.equal("v1");
//   });

//   // either the magic number here is wrong or there are some missing files in the
//   // test fixture

//   it.skip(`should have a manifest (inventory) with 209 items in it`, async function() {
//     const inventoryPath1 = path.join(objectPath, "inventory.json");
//     const inv = await JSON.parse(fs.readFile(inventoryPath1));
//     assert.strictEqual(Object.keys(inv.manifest).length, 209);
//   });

//   it("should have file1.txt ", async function() {
//     const inventoryPath1 = path.join(objectPath, "inventory.json");
//     const inv = await JSON.parse(fs.readFileSync(inventoryPath1));
//     assert.strictEqual(
//       inv.manifest[file1Hash][0],
//       "v1/content/sample/lots_of_little_files/file_1.txt"
//     );
//     assert.strictEqual(
//       inv.versions["v1"].state[file1Hash][0],
//       "sample/lots_of_little_files/file_1.txt"
//     );
//   });

//   it("should list 1 copies of file with same content in the manifest and 4 in v1", async function() {
//     const inventoryPath1 = path.join(objectPath, "inventory.json");
//     const inv = await JSON.parse(fs.readFileSync(inventoryPath1));
//     assert.strictEqual(inv.manifest[repeatedFileHash].length, 1);
//     assert.strictEqual(inv.versions["v1"].state[repeatedFileHash].length, 4);
//   });

//   it("should have an inventory digest file", function() {
//     const inventoryPath1 = path.join(objectPath, "inventory.json");
//     assert.strictEqual(fs.existsSync(inventoryPath1 + ".sha512"), true);
//   });

//   it("should have a V1 inventory file", function() {
//     assert.strictEqual(
//       fs.existsSync(path.join(objectPath, "v1", "inventory.json")),
//       true
//     );
//   });

//   it("should have a V1 inventory digest file", function() {
//     assert.strictEqual(
//       fs.existsSync(path.join(objectPath, "v1", "inventory.json.sha512")),
//       true
//     );
//   });
// });

// describe.skip("object with content added by a callback", async function() {
//   const objectPath1 = path.join(process.cwd(), "./test-data/ocfl-object1");
//   const inventoryPath1 = path.join(objectPath1, "inventory.json");
//   const inventoryPath1_v1 = path.join(objectPath1, "v1", "inventory.json");
//   const id = "some_id";
//   // const object = new OcflObject({ id, ocflRoot: objectPath1 });
//   const sourcePath1 = path.join(
//     process.cwd(),
//     "./test-data/ocfl-object1-source"
//   );

//   const CONTENT = {
//     "dir/file1.txt": "Contents of file1.txt",
//     "dir/file2.txt": "Contents of file2.txt",
//     "file3.txt": "Contents of file3.txt"
//   };

//   const makeContent = async dir => {
//     const files = Object.keys(CONTENT);
//     for (const f of files) {
//       const d = path.join(dir, path.dirname(f));
//       await fs.ensureDir(d);
//       await fs.writeFile(path.join(dir, f), CONTENT[f]);
//     }
//   };

//   let objectPath;
//   beforeEach(async () => {
//     createDirectory(objectPath1);
//     objectPath = path.join(objectPath1, pairtree.path(id));
//     await object.create();
//     await object.importDir("some_id", sourcePath1);
//   });

//   afterEach(async function() {
//     // await fs.remove(objectPath1);
//   });

//   it("can create an object with a callback that writes to the directory", async function() {
//     await object.create();
//     await object.addContent("some_id", makeContent);
//     assert.strictEqual(object.ocflVersion, "1.0");
//   });

//   it("should have the content generated by the callback", async function() {
//     const files = Object.keys(CONTENT);
//     for (const f of files) {
//       console.log(f, objectPath);
//       const ocflf = path.join(objectPath, "v1/content", f);
//       expect(ocflf)
//         .to.be.a.file(`${ocflf} is a file`)
//         .with.content(CONTENT[f]);
//     }
//   });

//   it("should have a manifest entry for each file with the correct hash", async function() {
//     const files = Object.keys(CONTENT);
//     const inv = await fs.readJSON(inventoryPath1);
//     const manifest = inv.manifest;
//     for (const f of files) {
//       const ocflf = path.join(objectPath1, "v1/content", f);
//       expect(ocflf)
//         .to.be.a.file(`${ocflf} is a file`)
//         .with.content(CONTENT[f]);
//       const h = await hasha.fromFile(ocflf, { algorithm: DIGEST_ALGORITHM });
//       expect(manifest[h][0]).to.equal(path.join("v1/content", f));
//       delete manifest[h];
//     }
//     expect(manifest).to.be.empty;
//   });

//   // it('should have file1.txt ', async function() {
//   //   const inv = await JSON.parse(fs.readFileSync(inventoryPath1));
//   //   assert.strictEqual(inv.manifest[file1Hash][0],"v1/content/sample/lots_of_little_files/file_1.txt");
//   //   assert.strictEqual(inv.versions["v1"].state[file1Hash][0], "sample/lots_of_little_files/file_1.txt");
//   // });

//   // it('should list 1 copies of file with same content in the manifest and 4 in v1', async function() {
//   //   const inv = await JSON.parse(fs.readFileSync(inventoryPath1));
//   //   assert.strictEqual(inv.manifest[repeatedFileHash].length, 1);
//   //   assert.strictEqual(inv.versions["v1"].state[repeatedFileHash].length,4);
//   // });

//   it("should have an inventory digest file", function() {
//     assert.strictEqual(fs.existsSync(inventoryPath1 + ".sha512"), true);
//   });

//   it("should have a V1 inventory file", function() {
//     assert.strictEqual(
//       fs.existsSync(path.join(objectPath1, "v1", "inventory.json")),
//       true
//     );
//   });

//   it("should have a V1 inventory digest file", function() {
//     assert.strictEqual(
//       fs.existsSync(path.join(objectPath1, "v1", "inventory.json.sha512")),
//       true
//     );
//   });
// });
