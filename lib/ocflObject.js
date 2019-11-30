const fs = require("fs-extra");
const path = require("path");
const hasha = require("hasha");
const uuidv5 = require("uuid/v5");
const {
  compact,
  flatten,
  flattenDeep,
  orderBy,
  groupBy,
  cloneDeep,
  uniq
} = require("lodash");
const pairtree = require("pairtree");
const Repository = require("./repository");

const DIGEST_ALGORITHM = "sha512";

class OcflObject {
  constructor({ id, objectPath, ocflRoot }) {
    this.ocflRoot = ocflRoot;
    this.ocflVersion = "1.0";
    this.namaste = `0=${this.__nameVersion(this.ocflVersion)}`;
    this.contentVersion = null; // No content yet
    this.versions = null;
    this.id = null; // Not set yet
    this.DIGEST_ALGORITHM = DIGEST_ALGORITHM;

    if (objectPath) {
      this.id = objectPath;
      this.depositPath = path.join(ocflRoot, "deposit", objectPath);
      this.repositoryPath = path.join(ocflRoot, objectPath);
      this.backupPath = path.join(ocflRoot, "backup", objectPath);
    } else if (id && !objectPath) {
      const r = new Repository({ ocflRoot });
      this.id = r.objectIdToPath(id);
      this.depositPath = path.join(ocflRoot, "deposit", r.objectIdToPath(id));
      this.repositoryPath = path.join(ocflRoot, r.objectIdToPath(id));
      this.backupPath = path.join(ocflRoot, "backup", r.objectIdToPath(id));
    }
  }

  //
  // PUBLIC API
  //
  async update({ source = undefined, writer = undefined }) {
    // only source OR writer (a callback) can be defined
    //  enforce this!
    if (source && writer)
      throw new Error("Specify only one of source or writer - not both.");

    // if neither - object to that too!
    if (!source && !writer)
      throw new Error("Specify at least one of source or writer.");

    return new Promise(async (resolve, reject) => {
      // target will ALWAYS be the content folder relative to the deposit path
      //  it will either be v1 or the new version after the original
      //  object has been copied back in

      // version is the new version
      let version, target;
      try {
        ({ version, target } = await this.__initObject());
      } catch (error) {
        return reject(new Error(error.message));
      }

      // either invoked the callers writer method
      if (writer) {
        await writer({ target });
      } else if (source) {
        // or copy the content of source to the target folder
        await fs.copy(source, target);
      }

      // get last inventory
      let lastVersionInventory = await this.getLatestInventory();

      // initialiase the current inventory off the new version
      let currentVersionInventory = await this.__initialiseInventory({
        version,
        target
      });

      // if there's a last inventory - ie this isn't a version 1
      if (lastVersionInventory) {
        // generate a current version inventory relative to the previous
        //  inventory - that is, remove new files that haven't changed and map
        //  those back in to the previous version.
        currentVersionInventory = await this.__generateCurrentInventory({
          lastVersionInventory,
          currentVersionInventory,
          target
        });

        // if null - no change - resolve()
        if (!currentVersionInventory) {
          resolve();
          return;
        }

        // version n - write away!
        try {
          await this.__writeVersion({
            inventory: currentVersionInventory
          });
        } catch (error) {
          return reject(new Error(error.message));
        }
      } else {
        // version 1 - write away!
        try {
          await this.__writeVersion1({
            inventory: currentVersionInventory
          });
        } catch (error) {
          return reject(new Error(error.message));
        }
      }
      resolve();
    });
  }

  async isObject() {
    // TODO: Check if this content root with NAMASTE and returns ocfl version
    // 0=ocfl_object_1.0
    // looks at path and see if the content of the file is
    // TODO: Make this look for a namaste file beginning with 0=ocfl_object_ and extract the version
    const theFile = path.join(
      this.repositoryPath,
      "0=" + this.__nameVersion(this.ocflVersion)
    );
    return await fs.pathExists(theFile);
  }

  async isAvailable() {
    // return true if the objectPath is available to be used
    //  for an object
    if (!(await fs.pathExists(this.repositoryPath))) return true;
    let stats = await fs.stat(this.repositoryPath);
    if (stats.isDirectory()) {
      const ocflVersion = await this.isObject(this.repositoryPath);
      const content = await fs.readdir(this.repositoryPath);
      if (ocflVersion || content.length) return false;
    } else {
      return false;
    }
    return true;
  }

  async load() {
    // Tries to load an existing object residing at this.repositoryPath
    let stats;
    try {
      stats = await fs.stat(this.repositoryPath);
    } catch (error) {
      throw new Error(
        `${this.repositoryPath} does not exist or is not a directory`
      );
    }
    if ((await fs.pathExists(this.repositoryPath)) && stats.isDirectory()) {
      const ocflVersion = await this.isObject(this.repositoryPath);
      if (!ocflVersion) {
        throw new Error(`This path doesn't look like an OCFL object`);
      }
      let inventory = path.join(this.repositoryPath, "inventory.json");
      inventory = await fs.readJson(inventory);

      const versions = Object.keys(inventory.versions).map(version => {
        return {
          version,
          created: inventory.versions[version].created
        };
      });
      this.versions = orderBy(versions, v =>
        parseInt(v.version.replace("v", ""))
      );
    } else {
      throw new Error(`${this.path} does not exist or is not a directory`);
    }
  }

  async remove() {
    await fs.remove(this.repositoryPath);
    return null;
  }

  getVersions() {
    return this.versions;
  }

  async getAllVersions() {
    for (let version of this.versions) {
      for (let v of this.versions) {
        await this.getVersion({ version: v.version });
      }
    }
    return this.versions;
  }

  async getVersion({ version }) {
    if (version === "latest") {
      version = [...this.versions].pop().version;
    }
    let inventory = path.join(this.repositoryPath, version, "inventory.json");
    try {
      inventory = await fs.readJson(inventory);
    } catch (error) {
      throw new Error("Unable to load version inventory.");
    }
    let files = [];
    for (let hash of Object.keys(inventory.manifest)) {
      let items = inventory.manifest[hash];
      files.push(
        items.map(item => {
          return {
            name: item.split("/").pop(),
            path: item,
            hash,
            version: parseInt(
              item
                .split("/")
                .shift()
                .replace("v", "")
            )
          };
        })
      );
    }
    files = flattenDeep(files);
    files = groupBy(files, "name");
    for (let file of Object.keys(files)) {
      files[file] = orderBy(files[file], "version");
    }

    this.versions = this.versions.map(v => {
      if (v.version === version) v.state = files;
      return v;
    });
    return this.versions.filter(v => v.version === version)[0];
  }

  getLatestVersion() {
    let latestVersion = cloneDeep(this.versions).pop();
    if (latestVersion.state) return latestVersion;
    return this.getVersion({ version: latestVersion.version });
  }

  async getInventory({ version }) {
    const inventoryPath = path.join(
      this.repositoryPath,
      version,
      "inventory.json"
    );
    if (await fs.exists(inventoryPath)) {
      return await fs.readJSON(inventoryPath);
    } else {
      return null;
    }
  }

  async getLatestInventory() {
    const inventoryPath = path.join(this.repositoryPath, "inventory.json");
    if (await fs.exists(inventoryPath)) {
      return await fs.readJSON(inventoryPath);
    } else {
      return null;
    }
  }

  //
  // PRIVATE METHODS
  //

  async __initObject() {
    // check deposit to see if this object is already being operated on
    if (await fs.pathExists(this.depositPath))
      throw new Error("An object with that ID is already in the deposit path.");

    // ensure the object is not the child of another object
    if (await this.__isChildOfAnotherObject())
      throw new Error(
        `This object is a child of an existing object and that's not allowed.`
      );

    // if not - init the deposit path
    await fs.mkdirp(this.depositPath);

    // check if this object is in the repo and sync the content back to deposit
    if (await fs.pathExists(this.repositoryPath)) {
      // copy the current object back to deposit
      await fs.copy(this.repositoryPath, this.depositPath);

      // add the next version path
      const latestInventory = await this.getLatestInventory();
      const nextVersion =
        "v" + (parseInt(latestInventory.head.replace("v", "")) + 1);
      const versionPath = path.join(this.depositPath, nextVersion, "/content");
      await fs.ensureDir(versionPath);

      return { version: nextVersion, target: versionPath };
    } else {
      // init deposit with a version 1
      await this.__generateNamaste();
      const versionPath = path.join(this.depositPath, "v1/content");
      await fs.ensureDir(versionPath);
      return { version: "v1", target: versionPath };
    }
  }

  async __isChildOfAnotherObject() {
    // this path cannot be the child of another object
    //  we can determine that by walking back up the path and looking
    //  for an "0=" + this.nameVersion(this.ocflVersion) file
    const pathComponents = compact(this.repositoryPath.split("/"));

    // ditch the final path element - we're only checking parents
    //  so by definition, the final path element is the one we're on
    pathComponents.pop();
    if (pathComponents.length === 1) {
      // we must be at the ocflRoot so we're ok to continue
      return false;
    }
    let parentIsOcflObject = [];
    let objectPath = pathComponents.shift();
    for (let p of pathComponents) {
      objectPath = path.join(objectPath, p);
      parentIsOcflObject.push(
        await fs.pathExists(path.join(objectPath, this.namaste))
      );
    }
    return parentIsOcflObject.includes(true);
  }

  async __initialiseInventory({ version, target }) {
    const inv = {
      id: this.id,
      type: "https://ocfl.io/1.0/spec/#inventory",
      digestAlgorithm: this.DIGEST_ALGORITHM,
      head: version,
      versions: {}
    };
    inv.versions[version] = {
      created: new Date().toISOString(),
      state: {}
    };
    // TODO Message and state keys in version
    var hashpairs = await this.__digest_dir(target);
    var versionState = inv.versions[version].state;
    inv["manifest"] = {};
    for (let i = 0; i < hashpairs.length; i += 2) {
      const thisHash = hashpairs[i + 1];
      const thisPath = path.relative(this.depositPath, hashpairs[i]);
      const versionPath = path.relative(
        path.join(version, "content"),
        thisPath
      );
      if (!inv.manifest[thisHash]) {
        inv.manifest[thisHash] = [thisPath];
      } else {
        inv.manifest[thisHash].push(thisPath);
      }

      if (!versionState[thisHash]) {
        versionState[thisHash] = [versionPath];
      } else {
        versionState[thisHash].push(versionPath);
      }
    }
    return inv;
  }

  async __writeInventories({ inventory }) {
    // write root inventory and inventory hash file
    let inventoryFile = path.join(this.depositPath, "inventory.json");
    await fs.writeJson(inventoryFile, inventory, { spaces: 2 });
    const inventoryHash = await this.__hash_file(inventoryFile);
    await fs.writeFile(
      `${inventoryFile}.${this.DIGEST_ALGORITHM}`,
      `${inventoryHash}   inventory.json`
    );

    // write version inventory and inventory hash file
    inventoryFile = path.join(
      this.depositPath,
      inventory.head,
      "inventory.json"
    );
    await fs.writeJson(inventoryFile, inventory, { spaces: 2 });
    await fs.writeFile(
      `${inventoryFile}.${this.DIGEST_ALGORITHM}`,
      `${inventoryHash}   inventory.json`
    );
  }

  async __writeVersion1({ inventory }) {
    try {
      // Put the inventory in the root AND version folder
      await this.__writeInventories({ inventory });
      this.contentVersion = inventory.head;

      // move the deposit object to the repository
      await fs.move(this.depositPath, this.repositoryPath);
      await fs.remove(this.depositPath);
    } catch (error) {
      throw new Error("Error moving deposit object to repository.");
    }
  }

  async __writeVersion({ inventory }) {
    // put the inventory in the root AND version folder
    await this.__writeInventories({ inventory });
    this.contentVersion = inventory.head;

    try {
      // temporarily move the original object if it exists
      if (await fs.pathExists(this.repositoryPath))
        await fs.move(this.repositoryPath, this.backupPath);

      // move the deposit object to the repository
      await fs.move(this.depositPath, this.repositoryPath);

      // cleanup - remove deposit object and backed up original
      await fs.remove(this.depositPath);
      await fs.remove(this.backupPath);
    } catch (error) {
      throw new Error("Error moving deposit object to repository.");
    }
  }

  async __generateCurrentInventory({
    lastVersionInventory,
    currentVersionInventory,
    target
  }) {
    let manifest = {};

    // iterate over currentVersionInventory manifest entries
    for (let entry of Object.entries(currentVersionInventory.manifest)) {
      let hash = entry[0];
      const currentVersionFiles = entry[1];
      const lastVersionFiles = lastVersionInventory.manifest[hash] || [];

      // figure out whether the files are the same, new or deleted.
      let files = await this.__processFiles({
        currentVersion: currentVersionInventory.head,
        depositPath: this.depositPath,
        currentVersionFiles,
        lastVersionFiles
      });
      manifest[hash] = files;
    }

    // udpate the currentVersionInventory manifest
    currentVersionInventory.manifest = manifest;

    // remove empty version folders
    await this.__removeEmptyDirectories({
      folder: target
    });

    // return if there's no change to the object
    const lastVersionManifestHash = hasha(
      JSON.stringify(lastVersionInventory.manifest)
    );
    const currentVersionManifestHash = hasha(
      JSON.stringify(currentVersionInventory.manifest)
    );
    if (lastVersionManifestHash === currentVersionManifestHash) {
      await fs.remove(this.depositPath);
      return null;
    }

    // otherwise - map the old versions in to the current inventory
    currentVersionInventory.versions = {
      ...lastVersionInventory.versions,
      ...currentVersionInventory.versions
    };

    // return the verified currentVersionInventory
    return currentVersionInventory;
  }

  async __processFiles({
    currentVersion,
    depositPath,
    currentVersionFiles,
    lastVersionFiles
  }) {
    let files = [...currentVersionFiles, ...lastVersionFiles];

    // group files by their relative paths with version stripped off
    files = groupBy(files, file =>
      file
        .split("/")
        .slice(1)
        .join("/")
    );

    // expect to see something like
    /*
        { 
          'content/file1.txt': [ 'v5/content/file1.txt', 'v4/content/file1.txt' ],
          'content/file2.txt': [ 'v3/content/file2.txt' ] 
        }
      */

    // iterate over the file list and remove anything that doesn't have a current version
    //  that's a file that has been removed so we don't want to return that to the manifest
    for (let file of Object.keys(files)) {
      let hasCurrentVersion = files[file].filter(f => f.match(currentVersion));
      if (!hasCurrentVersion.length) delete files[file];
    }

    // expect to see something like - note file2 is not there
    /*
        { 
          'content/file1.txt': [ 'v5/content/file1.txt', 'v4/content/file1.txt' ],
        }
      */

    // iterate over the remaining file list and pick out the earliest version
    //  of each file and return that.
    //
    // if there's only one version - then return that as it's a new file
    let remappedFiles = [];
    for (let file of Object.keys(files)) {
      // two versions - remove the first (newest - remember, the hash is the same)
      if (files[file].length === 2) {
        await fs.remove(path.join(depositPath, files[file].shift()));
      }
      // return whatever is left - this could be either the older of two versions
      //  or a single version if it's a new file
      remappedFiles.push(...files[file]);
    }
    return remappedFiles;
  }

  __nameVersion() {
    return `ocfl_object_${this.ocflVersion}`;
  }

  async __generateNamaste() {
    const namasteFile = path.join(this.depositPath, this.namaste);
    await fs.writeFile(namasteFile, this.__nameVersion());
  }

  async __digest_dir(dir) {
    var items = {};
    const contents = await fs.readdir(dir);
    items = flatten(
      await Promise.all(
        contents.map(async p1 => {
          const p = path.join(dir, p1);
          const stats = await fs.stat(p);
          if (stats.isDirectory()) {
            return await this.__digest_dir(p);
          } else {
            const h = await this.__hash_file(p);
            return [p, h];
          }
        })
      )
    );
    return items;
  }

  async __hash_file(p) {
    const hash = await hasha.fromFile(p, { algorithm: DIGEST_ALGORITHM });
    return hash;
  }

  async __removeEmptyDirectories({ folder }) {
    // Remove empty directories
    // Adapted (nade async) from: https://gist.github.com/jakub-g/5903dc7e4028133704a4
    if (!folder) folder = this.depositPath;
    const stats = await fs.stat(folder);
    var isDir = await stats.isDirectory();
    if (isDir) {
      var files = await fs.readdir(folder);
      if (files.length > 0) {
        for (let f of files) {
          var fullPath = path.join(folder, f);
          await this.__removeEmptyDirectories({ folder: fullPath });
        }
        files = await fs.readdir(folder);
      }
      if (!files.length) await fs.rmdir(folder);
    }
  }

  // addContent is passed an id and a callback - this takes one argument, the
  // directory into which content is to be written.
  // This is called for both new and merged versions: the incoming version is
  // written as v1 of a new object in the deposit directory, and if it's not the
  // first version it's then merged with the existing most recent version

  // async addContent({ id, writeContent }) {
  //   // Copy files into v1
  //   const version = "v1"; // Always a fresh start as we're not touching an existing repo object
  //   const versionPath = path.join(this.path, version, "content");
  //   await fs.ensureDir(versionPath);
  //   await writeContent(versionPath);

  //   // Make an inventory
  //   const inv = await this.inventory(id, versionPath);

  //   // Put the inventory in the root AND version dir
  //   await this.writeInventories({ inventory: inv, newVersion: version });
  //   this.contentVersion = await this.determineVersion();
  //   this.id = id;
  // }

  // // preserving the old interface here
  // async importDir({ id, source }) {
  //   await this.addContent({
  //     id,
  //     writeContent: async target => {
  //       await fs.copy(source, target);
  //     }
  //   });
  // }

  // async create() {
  //   // Creates a blank object with a content dir but no content at <path>
  //   // if (this.path) {
  //   //   throw new Error(
  //   //     "This object has already been initialized at: " + this.path
  //   //   );
  //   // }
  //   // this.path = path;
  //   try {
  //     const stats = await fs.stat(this.path);
  //     if ((await fs.pathExists(this.path)) && stats.isDirectory()) {
  //       const readDir = await fs.readdir(this.path);
  //       if (readDir.length <= 0) {
  //         // empty so initialise an object here
  //         await this.generateNamaste();
  //       } else {
  //         throw new Error(
  //           "can't initialise an object here as there are already files"
  //         );
  //       }
  //     }
  //   } catch (error) {
  //     // path doesn't exist - create and initialise object there
  //     await fs.mkdirp(this.path);
  //     await this.generateNamaste();
  //   }
  // }

  // getVersions() {
  //   return cloneDeep(this.versions);
  // }

  // getVersionString(i) {
  //   // Make a version name as per the SHOULD in the spec v1..vn
  //   // TODO have an option for zero padding
  //   return "v" + i;
  // }

  // async determineVersion() {
  //   const inv = await this.getLatestInventory();
  //   if (inv) {
  //     return inv.head;
  //   } else {
  //     return null;
  //   }
  //   // Here's not how to do it:
  //   /* var version = 0;
  //   const dirContents = await fs.readdir(this.path);
  //   for (let f of dirContents.filter(function(d){return d.match(/^v\d+$/)})){
  //       const v =  parseInt(f.replace("v",""));
  //       if (v > version) {
  //           version = v;
  //       }
  //   }
  //   return version;10. */
  //   // Look at each dir that matches v\d+
  // }

  // async inventory(id, dir) {
  //   const versionId = "v1";
  //   const inv = {
  //     id: id,
  //     type: "https://ocfl.io/1.0/spec/#inventory",
  //     digestAlgorithm: DIGEST_ALGORITHM,
  //     head: versionId,
  //     versions: {}
  //   };
  //   inv.versions[versionId] = {
  //     created: new Date().toISOString(),
  //     state: {}
  //   };
  //   // TODO Message and state keys in version
  //   var hashpairs = await this.digest_dir(dir);
  //   var versionState = inv.versions[versionId].state;
  //   inv["manifest"] = {};
  //   for (let i = 0; i < hashpairs.length; i += 2) {
  //     const thisHash = hashpairs[i + 1];
  //     const thisPath = path.relative(this.path, hashpairs[i]);
  //     const versionPath = path.relative(path.join("v1", "content"), thisPath);
  //     if (!inv["manifest"][thisHash]) {
  //       //Store only ONE path
  //       inv["manifest"][thisHash] = [thisPath];
  //     } else {
  //       // TODO DELETE THIS FILE FROM THE OBJECT BEFORE WE STORE IT
  //     }

  //     if (versionState[thisHash]) {
  //       // Store all
  //       versionState[thisHash].push(versionPath);
  //     } else {
  //       versionState[thisHash] = [versionPath];
  //     }
  //   }
  //   return inv;
  // }

  // async getFilePath(filePath, version) {
  //   const inv = await this.getInventory();
  //   if (!version) {
  //     version = inv.head;
  //   }
  //   const state = inv.versions[version].state;
  //   for (let hash of Object.keys(state)) {
  //     const aPath = state[hash];
  //     const findPath = _.find(aPath, p => p === filePath);
  //     if (findPath) {
  //       return inv.manifest[hash][0];
  //     }
  //   }
  //   throw new Error("cannot find file");
  // }
}
module.exports = OcflObject;
