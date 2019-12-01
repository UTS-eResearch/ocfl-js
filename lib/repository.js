const fs = require("fs-extra");
const path = require("path");
const pairtree = require("pairtree");
const EventEmitter = require("events");

const DEPOSIT_DIR = "deposit";

class Repository extends EventEmitter {
  constructor({ ocflRoot }) {
    super();
    this.ocflVersion = "1.0";
    this.ocflRoot = ocflRoot;
    this.namaste = path.join(this.ocflRoot, `0=ocfl_${this.ocflVersion}`);
    // For now we only put things on pairtree paths
    this.objectIdToPath = pairtree.path;
  }

  //
  // PUBLIC API
  //

  async create() {
    // Sets up an empty repository
    if (await fs.pathExists(this.ocflRoot)) {
      const stats = await fs.stat(this.ocflRoot);
      if (stats.isDirectory()) {
        if (await fs.pathExists(this.namaste)) {
          throw new Error("This repository has already been initialized.");
        }

        const readDir = await fs.readdir(this.ocflRoot);
        if (readDir.length <= 0) {
          // empty so initialise a repo here
          await this.__generateNamaste();
        } else {
          throw new Error(
            "Can't initialise a repository as there are already files."
          );
        }
      }
    } else {
      //else if dir doesn't exist it dies
      throw new Error("Directory does not exist");
    }
  }

  async isRepository() {
    return await fs.pathExists(this.namaste);
  }

  async findObjects({ root }) {
    if (!root) root = this.ocflRoot;

    // Recursive function to find OCFL objects
    const dirs = await fs.readdir(root);
    for (let d of dirs) {
      const potentialObject = path.join(root, d);
      const stats = await fs.stat(potentialObject);
      if (stats.isDirectory()) {
        // Looks like an an object
        if (potentialObject.match(DEPOSIT_DIR)) continue;
        if (
          await fs.pathExists(
            path.join(potentialObject, `0=ocfl_object_${this.ocflVersion}`)
          )
        ) {
          const objectConstructer = {
            ocflRoot: this.ocflRoot,
            objectPath: potentialObject.replace(this.ocflRoot, "")
          };
          this.emit("object", objectConstructer);
        } else {
          this.findObjects({ root: potentialObject });
        }
      }
    }
  }

  //
  // PRIVATE API
  //

  __nameVersion(version) {
    return `ocfl__${version}`;
  }

  async __generateNamaste() {
    await fs.writeFile(this.namaste, this.ocflVersion);
  }

  // incrementVersion(ver) {
  //   return "v" + (parseInt(ver.replace("v", "")) + 1);
  // }
  // async objects() {
  //   var objects = [];
  //   const o = await this.findObjects({ dir: this.ocflRoot, objects });
  //   return objects;
  // }

  // async export({ id, target, options }) {
  //   const sourceObject = new OcflObject({
  //     ocflRoot: this.ocflRoot,
  //     objectPath: this.objectIdToPath(id)
  //   });

  //   let targetUseable = false;
  //   if (await fs.pathExists(target)) {
  //     let stats = await fs.stat(target);
  //     if (stats.isDirectory()) {
  //       const content = await fs.readdir(target);
  //       if (!content.length) targetUseable = true;
  //     }
  //   } else {
  //     targetUseable = true;
  //   }
  //   if (!targetUseable)
  //     throw new Error(
  //       "That target is not useable. A non existent path or an empty folder is required."
  //     );

  //   // TODO handle versions look in options.version

  //   // TODO handle options link
  //   // TODO make a new method objectIdToAbsolute path

  //   await fs.mkdir(target);

  //   sourceObject.load();
  //   const inv = await sourceObject.getLatestInventory();
  //   var ver = inv.head;
  //   if (options && options.version) {
  //     ver = options.version;
  //   }
  //   if (!inv.versions[ver]) {
  //     throw new Error("Can't export a version that doesn't exist.");
  //   }
  //   const state = inv.versions[ver].state;
  //   for (const hash of Object.keys(state)) {
  //     // Hashes point to arrays of paths
  //     for (const f of state[hash]) {
  //       const fileExportTo = path.join(target, f);
  //       const fileExportFrom = path.join(
  //         sourceObject.path,
  //         inv.manifest[hash][0]
  //       );
  //       const copied = await fs.copy(fileExportFrom, fileExportTo);
  //     }
  //   }

  // async isContentRoot(aPath) {
  //   // 0=ocfl_1.0
  //   // looks at path and see if the content of the file is
  //   return await fs.pathExists(this.namaste);
  // }
  // async containsContentRoot(aPath) {
  //   // TODO
  // }
  // async makeDepositPath({ id }) {
  //   // Make sure we have a working directory
  //   const depositPath = path.join(this.path, DEPOSIT_DIR);
  //   if (!(await fs.pathExists(depositPath))) {
  //     const depositDir = await fs.mkdir(depositPath);
  //   }

  //   // Make a temp directory under STORAGE_ROOT/deposit/
  //   // Use pairtree to escape path but get rid of long path
  //   const objectDepositPath = path.join(
  //     this.path,
  //     "deposit",
  //     this.objectIdToPath(id).replace(/\//g, "")
  //   );
  //   if (await fs.pathExists(objectDepositPath)) {
  //     throw new Error(
  //       "There is already an object with this ID being deposited or left behind after a crash. Cannot proceed."
  //     );
  //   }
  //   await fs.mkdirp(objectDepositPath);
  //   return objectDepositPath;
  // }

  // async importNewObjectDir({ id, sourceDir }) {
  //   // Add an object to the repository given a source directory
  //   // id = an optional id String
  //   // dir = a directory somewhere on disk
  //   return await this.createNewObjectContent({
  //     id,
  //     writeContent: async targetDir => {
  //       await fs.copy(sourceDir, targetDir);
  //     }
  //   });
  // }

  // async createNewObjectContent({ id, writeContent }) {
  //   // Add an object to the repository with a callback that provides the content.
  //   // This is called by importNewObject under the hood
  //   // writeContent = a callback that takes one argument, the directory to
  //   // which content is to be written (in the repo's deposit directory)
  //   // id = an optional id String

  //   // Make a temp random ID used for deposit

  //   // If no ID supplied use the random one - gets returned later
  //   // TODO: Make this a URI
  //   if (!id) {
  //     id = uuidv4();
  //   }

  //   const repositoryObject = new OcflObject({
  //     ocflRoot: this.ocflRoot,
  //     id
  //   });
  //   // await repositoryObject.create();

  //   // const objectDepositPath = await this.makeDepositPath({ id });

  //   // console.log("(((", objectDepositPath);
  //   const depositObject = new OcflObject({
  //     ocflRoot: path.join(this.ocflRoot, "deposit"),
  //     id
  //   });
  //   await depositObject.create();

  //   // Check that no parent path is an OCFL object
  //   if (await this.isChildOfAnotherObject({ id })) {
  //     throw new Error(
  //       `A parent of this path seems to be an OCFL object and that's not allowed`
  //     );
  //   }

  //   // Add content by initialising object with the calllback
  //   const initialized = await depositObject.addContent(id, writeContent);

  //   if (!(await repositoryObject.getLatestInventory())) {
  //     await fs.move(`${depositObject.path}/`, `${repositoryObject.path}/`);
  //   } else {
  //     // Merge object
  //     await this.mergeObjectWith(depositObject, repositoryObject);
  //   }
  //   depositObject.remove();

  //   const newObj = new OcflObject({ ocflRoot: this.ocflRoot, id });
  //   await newObj.load();
  //   return newObj;
  // }

  // async isChildOfAnotherObject({ id, aPath }) {
  //   if (id) aPath = pairtree.path(id);

  //   // this path cannot be the child of another object
  //   //  we can determine that by walking back up the path and looking
  //   //  for an "0=" + this.nameVersion(this.ocflVersion) file
  //   const pathComponents = compact(aPath.split("/"));

  //   // ditch the final path element - we're only checking parents
  //   //  so by definition, the final path element is the one we're on
  //   pathComponents.pop();
  //   let parentIsOcflObject = [];
  //   aPath = this.ocflRoot;
  //   for (let p of pathComponents) {
  //     aPath = path.join(aPath, "/", p);
  //     const theFile = path.join(
  //       aPath,
  //       "0=" + this.nameVersion(this.ocflVersion)
  //     );
  //     parentIsOcflObject.push(await fs.pathExists(theFile));
  //   }
  //   return parentIsOcflObject.includes(true);
  // }

  // async mergeObjectWith(newObject, prevObject) {
  //   // Merge an object that's being submitted with one from the repositopry
  //   // We'll call this object the NEW object and the one in the repo the prev object

  //   const prevInventory = await prevObject.getLatestInventory();
  //   const newInventory = await newObject.getLatestInventory();

  //   if (!prevInventory) {
  //     await fs.move(`${newObject.path}/`, `${prevObject.path}/`);
  //     return;
  //   }

  //   // Get latest state
  //   const prevVersion = prevInventory.head;
  //   const prevState = prevInventory.versions[prevVersion].state;
  //   const newState = newInventory.versions["v1"].state;

  //   // Check whether this is just the same thing exactly as the last one
  //   if (Object.keys(newState).length === Object.keys(prevState).length) {
  //     // Same length, so may be the same
  //     var same = true;
  //     for (let hash of Object.keys(newState)) {
  //       if (!prevState[hash]) {
  //         same = false;
  //         break;
  //       }
  //     }
  //     if (same) {
  //       // First, do no harm
  //       // ie do nothing
  //       return prevObject;
  //     }
  //   }

  //   // Increment version number from existing object
  //   const newVersion = this.incrementVersion(prevVersion);

  //   // Move our v1 stuff to the new version number (we may delete some of it)
  //   const moved = await fs.move(
  //     path.join(newObject.path, "v1"),
  //     path.join(newObject.path, newVersion)
  //   );
  //   const newVersionPath = path.join(newObject.path, newVersion);

  //   // Go thru latest state one hash at a time
  //   for (let hash of Object.keys(newState)) {
  //     // Inheritance: Files inherited from the previous version unchanged are
  //     //referenced in the state block of the new version. These entries will be
  //     // identical to the corresponding entries in the previous version's state
  //     // block.

  //     // THAT IS: If there's already a manifest entry for this then remove the file and leave the entry here

  //     // Now that we've checked agains the latest version, check against the all-time store of hashes we know about
  //     //for (let file of newState[hash]) {
  //     for (var i = 0; i < newState[hash].length; i += 1) {
  //       const file = newState[hash][i];
  //       if (!prevInventory.manifest[hash]) {
  //         // We don't have a copy of this anywhere
  //         // Addition: Newly added files appear as new entries in the state block of
  //         // the new version. The file should be stored and an entry for the new
  //         // content must be made in the manifest block of the object's inventory.
  //         prevInventory.manifest[hash] = [
  //           path.join(newVersion, "content", file)
  //         ];
  //         // now we have at least one copy - subsequent copies in incoming objects can be deleted
  //       } else {
  //         // We have a copy of this file so delete the physical file
  //         // the file we have could be inhereted or re-instated
  //         const filePath = path.join(newVersionPath, "content", file);
  //         const del = await fs.remove(filePath);
  //       }
  //     }
  //   }
  //   // Spec says:
  //   // Deletion: Files deleted from the previous version are simply removed
  //   // from the state block of the new version
  //   // BUT: We never added them so nothing to do!
  //   prevInventory.versions[newVersion] = newInventory.versions["v1"]; // As updated
  //   prevInventory.head = newVersion;
  //   // Copy in the new version dir
  //   const invs = await newObject.writeInventories({
  //     inventory: prevInventory,
  //     newVersion
  //   });
  //   const rm = await newObject.removeEmptyDirectories();
  //   const vmoved = await fs.move(
  //     newVersionPath,
  //     path.join(prevObject.path, newVersion)
  //   );
  //   const invs_new = await prevObject.writeInventories({
  //     inventory: prevInventory,
  //     newVersion
  //   });
  //   // Clean up temp deposit dir
  //   const rm1 = await fs.remove(newObject.path);
  // }
}

module.exports = Repository;
