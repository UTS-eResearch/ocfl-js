const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const Repository = require('../lib/object');


function createDirectory(aPath) {
  if (!fs.existsSync(aPath)) {
    fs.mkdirSync(aPath);
  }
}

describe('object init', function () {

  describe('no dir', function () {
    const repoPath = path.join(process.cwd(), './test-data/ocfl_obj_test');
    const object = new Repository(repoPath);
    it('should test directory', async function f() {
      try {
        const init = await object.init();
      } catch (e) {
        assert.strictEqual(e.code, 'ENOENT')
      }
    })
  });

  describe('no init', function () {
    const repoPath = path.join(process.cwd(), './test-data/notocfl');
    const object = new Repository(repoPath);
    it('should not initialise directories with files', async function () {
      try {
        const init = await object.init();
      } catch (e) {
        assert.strictEqual(e.message, 'can\'t initialise a directory here as there are already files');
      }
    });
  });
});

const objectPath = path.join(process.cwd(), './test-data/ocfl-object');

describe('object init 2', function () {
  const object = new Repository(objectPath);
  createDirectory(objectPath);

  try {
    it('should test content root', async function () {
      const init = await object.init();
      assert.strictEqual(object.version, '1.0');
    });
    it('should have a namaste', function () {
      assert.strictEqual(object.path, objectPath);
    });
    it('should have a namaste file', function () {
      //create this test path
      assert.strictEqual(fs.existsSync(path.join(objectPath, '0=ocfl_object_1.0')), true);
    });
    it('should have a v1 dir', function () {
        //create this test path
        assert.strictEqual(fs.existsSync(path.join(objectPath, 'v1')), true);
      });
    
   
  } catch (e) {
    assert.notStrictEqual(e, null);
  }

});

const objectPath1 = path.join(process.cwd(), './test-data/ocfl-object1');
const sourcePath1 = path.join(process.cwd(), './test-data/ocfl-object1-source');

describe('object with content', function () {
  const object = new Repository(objectPath1);
  const inventoryPath1 = path.join(objectPath1, 'inventory.json');
  const inventoryPath1_v1 = path.join(objectPath1, 'v1', 'inventory.json');

  const id = "some_id";
  createDirectory(objectPath1);

  try {
    it('should test content root', async function () {
      const init = await object.initWithContentFromDir("some_id", sourcePath1);
      assert.strictEqual(object.version, '1.0');
    });
    it('should have a namaste', function () {
      assert.strictEqual(object.path, objectPath1);
    });
    it('should have a namaste file', function () {
      //create this test path
      assert.strictEqual(fs.existsSync(path.join(objectPath1, '0=ocfl_object_1.0')), true);
    });
    it('should have a v1 dir', function () {
        //create this test path
        assert.strictEqual(fs.existsSync(path.join(objectPath1, 'v1')), true);
      });
      it('should have a v1/content dir', function () {
        //create this test path
        assert.strictEqual(fs.existsSync(path.join(objectPath1, 'v1', 'content')), true);
      });

      it('should have a manifest (inventory)', function () {
        //create this test path
        assert.strictEqual(fs.existsSync(inventoryPath1), true);
      });

      it('should have a manifest (inventory)', function () {
        //create this test path
        const inv = JSON.parse(fs.readFileSync(inventoryPath1));
    
        assert.strictEqual(Object.keys(inv.manifest).length, 209);
      });
   
  } catch (e) {
    assert.notStrictEqual(e, null);
  }

});

after(function () {
  //TODO: destroy test repoPath
  fs.removeSync(objectPath);
  //fs.removeSync(objectPath1);
});
