const fs = require("fs-extra");
const path = require("path");
const pairtree = require("pairtree");
const OcflObject = require("./ocflObject");
const uuidv4 = require("uuidv4");
const { compact } = require("lodash");

const DEPOSIT_DIR = "deposit";

class Repository {
  constructor() {
    this.ocflVersion = "1.0";
    // For now we only put things on pairtree paths
    this.objectIdToPath = pairtree.path;
  }

  async create(path) {
    if (this.path) {
      throw new Error("This repository has already been initialized.");
    }
    this.path = path;

    // Sets up an empty repository minus the requisite /v1 directory
    //checks if the dir exists else dies
    const stats = await fs.stat(this.path);
    if ((await fs.pathExists(this.path)) && stats.isDirectory()) {
      const readDir = await fs.readdir(this.path);
      if (readDir.length <= 0) {
        // empty so initialise a repo here
        const generateNamaste = await this.generateNamaste(
          this.path,
          this.ocflVersion
        );
      } else {
        throw new Error(
          "can't initialise a repository as there are already files."
        );
      }
    } else {
      //else if dir doesn't exist it dies
      throw new Error("directory does not exist");
    }
  }

  async load(path) {
    // Connects to an existing repo residing at <path>
    if (this.path) {
      throw new Error("This repository has already been initialized.");
    }
    this.path = path;
    const stats = await fs.stat(this.path);
    if ((await fs.pathExists(this.path)) && stats.isDirectory()) {
      const version = await this.isContentRoot(this.path);
      if (!version) {
        throw new Error("Not an OCFL repository.");
      }
    } else {
      throw new Error("Directory does not exist.");
    }
  }

  async export(id, exportPath, options) {
    // Exports a directory to exportPath
    // TODO consider moving this to the object class
    if (!(await fs.pathExists(exportPath))) {
      throw new Error("Can't export as the directory does not exist.");
    }

    const stats = await fs.stat(exportPath);

    if (stats.isDirectory()) {
      const readDir = await fs.readdir(exportPath);
      if (readDir.length > 0) {
        // NOt empty so complain
        throw new Error("Can't export as the directory has stuff in it.");
      }
    } else {
      throw new Error("Can't export to an existing file.");
    }

    // TODO handle versions look in options.version

    // TODO handle options link
    // TODO make a new method objectIdToAbsolute path
    const objectPath = path.join(this.path, this.objectIdToPath(id));
    const objToExport = new OcflObject();
    objToExport.load(objectPath);
    const inv = await objToExport.getInventory();
    var ver = inv.head;
    if (options && options.version) {
      ver = options.version;
    }
    if (!inv.versions[ver]) {
      throw new Error("Can't export a version that doesn't exist.");
    }
    const state = inv.versions[ver].state;
    for (const hash of Object.keys(state)) {
      // Hashes point to arrays of paths
      for (const f of state[hash]) {
        const fileExportTo = path.join(exportPath, f);
        const fileExportFrom = path.join(
          objToExport.path,
          inv.manifest[hash][0]
        );
        const copied = await fs.copy(fileExportFrom, fileExportTo);
      }
    }
  }

  async objects() {
    var objects = [];
    const o = await this.findObjects(this.path, objects);
    return objects;
  }

  incrementVersion(ver) {
    return "v" + (parseInt(ver.replace("v", "")) + 1);
  }

  async findObjects(dir, objects) {
    // Recursive function to find OCFL objects
    const dirs = await fs.readdir(dir);
    for (let d of dirs) {
      const potential_dir = path.join(dir, d);
      const stats = await fs.stat(potential_dir);
      if (
        d != DEPOSIT_DIR &&
        (await fs.pathExists(potential_dir)) &&
        stats.isDirectory()
      ) {
        // Looks like an an object
        const object = new OcflObject();
        const objectNamastePath = path.join(
          potential_dir,
          "0=" + object.nameVersion(this.ocflVersion)
        );

        if (await fs.exists(objectNamastePath)) {
          const o = await object.load(potential_dir);
          objects.push(object);
        } else {
          objects.concat(await this.findObjects(potential_dir, objects));
        }
      }
    }
    return objects;
  }

  async makeDepositPath(id) {
    // Make sure we have a working directory
    const depositPath = path.join(this.path, DEPOSIT_DIR);
    if (!(await fs.pathExists(depositPath))) {
      const depositDir = await fs.mkdir(depositPath);
    }

    // Make a temp directory under STORAGE_ROOT/deposit/
    // Use pairtree to escape path but get rid of long path
    const objectDepositPath = path.join(
      this.path,
      "deposit",
      this.objectIdToPath(id).replace(/\//g, "")
    );
    if (await fs.pathExists(objectDepositPath)) {
      throw new Error(
        "There is already an object with this ID being deposited or left behind after a crash. Cannot proceed."
      );
    }
    await fs.mkdirp(objectDepositPath);
    return objectDepositPath;
  }

  async importNewObjectDir(id, sourceDir) {
    // Add an object to the repository given a source directory
    // id = an optional id String
    // dir = a directory somewhere on disk

    return await this.createNewObjectContent(id, async targetDir => {
      await fs.copy(sourceDir, targetDir);
    });
  }

  async createNewObjectContent(id, writeContent) {
    // Add an object to the repository with a callback that provides the content.
    // This is called by importNewObject under the hood
    // writeContent = a callback that takes one argument, the directory to
    // which content is to be written (in the repo's deposit directory)
    // id = an optional id String

    // Make a temp random ID used for deposit

    // If no ID supplied use the random one - gets returned later
    // TODO: Make this a URI
    if (!id) {
      id = uuidv4();
    }

    const object = new OcflObject();
    const objectRepoPath = path.join(this.path, this.objectIdToPath(id));

    // Check that no parent path is an OCFL object
    if (await this.isChildOfAnotherObject({ id })) {
      throw new Error(
        `A parent of this path seems to be an OCFL object and that's not allowed`
      );
    }

    // ok - let's get creating
    const objectDepositPath = await this.makeDepositPath(id);

    // Make a temp object in the /deposit dir in our repo
    const oi = await object.create(objectDepositPath);

    // Add content by initialising object with the calllback
    const initialized = await object.addContent(id, writeContent);

    // Move (not copy) the new object to the repository
    if (!(await fs.pathExists(objectRepoPath))) {
      await object.removeEmptyDirectories();
      await fs.move(objectDepositPath, objectRepoPath);
    } else {
      // Merge object
      const added = await this.mergeObjectWith(object, objectRepoPath);
      await fs.removeSync(objectDepositPath);
    }
    const newObj = new OcflObject();
    await newObj.load(objectRepoPath);
    return newObj;
  }

  async getObject(id) {
    const p = path.join(this.path, this.objectIdToPath(id));
    if (await fs.exists(p)) {
         const objToExport = new OcflObject();
          await objToExport.load(p);
          return objToExport;
    }
    else {
      return null; // Not found
    }

  }

  async isChildOfAnotherObject({ id, aPath }) {
    if (id) aPath = pairtree.path(id);

    // this path cannot be the child of another object
    //  we can determine that by walking back up the path and looking
    //  for an "0=" + this.nameVersion(this.ocflVersion) file
    const pathComponents = compact(aPath.split("/"));

    // ditch the final path element - we're only checking parents
    //  so by definition, the final path element is the one we're on
    pathComponents.pop();
    let parentIsOcflObject = [];
    aPath = this.path;
    for (let p of pathComponents) {
      aPath = path.join(aPath, "/", p);
      const theFile = path.join(
        aPath,
        "0=" + this.nameVersion(this.ocflVersion)
      );
      parentIsOcflObject.push(await fs.pathExists(theFile));
    }
    return parentIsOcflObject.includes(true);
  }



  async mergeObjectWith(newObject, prevObjectPath) {
    // Merge an object that's being submitted with one from the repositopry
    // We'll call this objec the NEW object and the one in the repo the prev object

    // Get the inventory from the existing object
    const prevObject = new OcflObject();
    const o = await prevObject.load(prevObjectPath);

    const prevInventory = await prevObject.getInventory();
    const newInventory = await newObject.getInventory();

    // Get latest state
    const prevVersion = prevInventory.head;
    const prevState = prevInventory.versions[prevVersion].state;
    const newState = newInventory.versions["v1"].state;

    // Check whether this is just the same thing exactly as the last one
    if (Object.keys(newState).length === Object.keys(prevState).length) {
      // Same length, so may be the same
      var same = true;
      for (let hash of Object.keys(newState)) {
        if (!prevState[hash]) {
          same = false;
          break;
        }
      }
      if (same) {
        // First, do no harm
        // ie do nothing
        return prevObject;
      }
    }

    // Increment version number from existing object
    const newVersion = this.incrementVersion(prevVersion);

    // Move our v1 stuff to the new version number (we may delete some of it)
    const moved = await fs.move(
      path.join(newObject.path, "v1"),
      path.join(newObject.path, newVersion)
    );
    const newVersionPath = path.join(newObject.path, newVersion);

    // Go thru latest state one hash at a time
    for (let hash of Object.keys(newState)) {
      // Inheritance: Files inherited from the previous version unchanged are
      //referenced in the state block of the new version. These entries will be
      // identical to the corresponding entries in the previous version's state
      // block.

      // THAT IS: If there's already a manifest entry for this then remove the file and leave the entry here

      // Now that we've checked agains the latest version, check against the all-time store of hashes we know about
      //for (let file of newState[hash]) {
      for (var i = 0; i < newState[hash].length; i += 1) {
        const file = newState[hash][i];
        if (!prevInventory.manifest[hash]) {
          // We don't have a copy of this anywhere
          // Addition: Newly added files appear as new entries in the state block of
          // the new version. The file should be stored and an entry for the new
          // content must be made in the manifest block of the object's inventory.
          prevInventory.manifest[hash] = [
            path.join(newVersion, "content", file)
          ];
          // now we have at least one copy - subsequent copies in incoming objects can be deleted
        } else {
          // We have a copy of this file so delete the physical file
          // the file we have could be inhereted or re-instated
          const filePath = path.join(newVersionPath, "content", file);
          const del = await fs.remove(filePath);
        }
      }
    }
    // Spec says:
    // Deletion: Files deleted from the previous version are simply removed
    // from the state block of the new version
    // BUT: We never added them so nothing to do!
    prevInventory.versions[newVersion] = newInventory.versions["v1"]; // As updated
    prevInventory.head = newVersion;
    // Copy in the new version dir
    const invs = await newObject.writeInventories(prevInventory, newVersion);
    const rm = await newObject.removeEmptyDirectories();
    const vmoved = await fs.move(
      newVersionPath,
      path.join(prevObject.path, newVersion)
    );
    const invs_new = await prevObject.writeInventories(
      prevInventory,
      newVersion
    );
    // Clean up temp deposit dir
    const rm1 = await fs.remove(newObject.path);
  }

  async isContentRoot(aPath) {
    // 0=ocfl_1.0
    // looks at path and see if the content of the file is
    const namastePath = path.join(
      aPath,
      "0=" + this.nameVersion(this.ocflVersion)
    );
    return await fs.pathExists(namastePath);
  }
  async containsContentRoot(aPath) {
    // TODO
  }

  nameVersion(version) {
    return "ocfl_object_" + version;
  }

  async generateNamaste(aPath, version) {
    const fileName = "0=" + this.nameVersion(version);
    const thePath = path.join(aPath, fileName);
    const writeFile = await fs.writeFile(thePath, this.nameVersion(version));
  }
}

module.exports = Repository;
