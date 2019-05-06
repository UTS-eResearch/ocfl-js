const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const Repository = require('../lib/repository');

function createDirectory(aPath) {
  if (!fs.existsSync(aPath)) {
    fs.mkdirSync(aPath);
  }
}

describe('repository init', function () {

  describe('no dir', function () {
    const repoPath = path.join(process.cwd(), './test-data/ocflX');
    const repository = new Repository(repoPath);
    it('should test directory', async function f() {
      try {
        const init = await repository.initRepo();
      } catch (e) {
        assert.strictEqual(e.code, 'ENOENT')
      }
    })
  });

  describe('no init', function () {
    const repoPath = path.join(process.cwd(), './test-data/notocfl');
    const repository = new Repository(repoPath);
    it('should not initialise directories with files', async function () {
      try {
        const init = await repository.initRepo();
      } catch (e) {
        assert.strictEqual(e.message, 'can\'t initialise a directory here as there are already files');
      }
    });
  });
});


describe('repository init 2', function () {
  const repositoryPath = path.join(process.cwd(), './test-data/ocfl1');
  fs.removeSync(repositoryPath);

  const repository = new Repository(repositoryPath);
  createDirectory(repositoryPath);
  const sourcePath1 = path.join(process.cwd(), './test-data/ocfl-object1-source');

  try {
    it('should test content root', async function () {
      const init = await repository.initRepo();
      assert.strictEqual(repository.version, '1.0');
    });
    it('should have a namaste', function () {
      assert.strictEqual(repository.path, repositoryPath);
    });
    it('should have a namaste file', function () {
      //create this test path
      assert.strictEqual(fs.existsSync(path.join(repositoryPath, '0=ocfl_1.0')), true);
    });
    it('should use your id for a new object if you give it one', async function(){
      const new_id = await repository.add_object_from_dir(sourcePath1, "some_other_id");
      // We got a UUID as an an ID
      assert.strictEqual(new_id, "some_other_id");
      // Check  that the object is there
      const objectPath  = path.join(repositoryPath, new_id.replace(/(..)/g, "$1/"));
      assert.strictEqual(fs.existsSync(objectPath), true);
     });
    it('should make up an ID if you add content', async function(){
      const new_id = await repository.add_object_from_dir(sourcePath1);
      // We got a UUID as an an ID
      assert.strictEqual(new_id.length, 36);
      // Check  that the object is there
      const objectPath  = path.join(repositoryPath, new_id.replace(/(..)/g, "$1/"));
      assert.strictEqual(fs.existsSync(objectPath), true);
     });
     it('should refuse to make an object if there is a dailed attempt in the deposit dir', async function(){
      try {
          const depositDir = await fs.mkdir(path.join(repositoryPath, "deposit", "some_id"));
          const new_id = await repository.add_object_from_dir(sourcePath1, "some_id");
      }
      catch (e) {
        assert.strictEqual(e.message, 'There is already an object with this ID being deposited or left behind after a crash. Cannot proceed.');
      }
     });

  } catch (e) {
    assert.notStrictEqual(e, null);
  }

});

after(function () {
  //TODO: destroy test repoPath
});
