const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const hasha = require('hasha');
const OcflObject = require('../lib/ocflObject');
const _ = require('lodash');

const DIGEST_ALGORITHM = 'sha512';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-fs'));



function createDirectory(aPath) {
  if (fs.existsSync(aPath)) {
      fs.removeSync(aPath);
  }
  fs.mkdirSync(aPath);
}

describe('object init', function () {

  describe('no dir', function () {
    const objPath = path.join(process.cwd(), './test-data/ocfl_obj_test');
    const object = new OcflObject();
    it('should test directory', async function f() {
      try {
        const init = await object.create(objPath);
      } catch (e) {
        assert.strictEqual(e.code, 'ENOENT')
      }
    })
  });

  describe('no init', function () {
    const objPath = path.join(process.cwd(), './test-data/notocfl');
    const object = new OcflObject();
    it('should not create an object in directories with files', async function () {
      try {
        const init = await object.create(objPath);
      } catch (e) {
        assert.strictEqual(e.message, 'can\'t initialise an object here as there are already files');
      }
    });
  });
});

const objectPath = path.join(process.cwd(), './test-data/ocfl-object');

describe('object init 2', function () {
  const object = new OcflObject();
  createDirectory(objectPath);

  try {
    it('should test content root', async function () {
      const init = await object.create(objectPath);
      assert.strictEqual(object.ocflVersion, '1.0');
    });
    it('should have a path', function () {
      assert.strictEqual(object.path, objectPath);
    });
    it('should have a namaste file', function () {
      assert.strictEqual(fs.existsSync(path.join(objectPath, '0=ocfl_object_1.0')), true);
    });

    it('should be version 0', function () {
        assert.strictEqual(object.contentVersion, null);
      });

    it('Should let you access an existing (on disk) object', async function() {
        const object2 = new OcflObject();
        const init = await object2.load(objectPath);

    });
   
  } catch (e) {
    console.log(e);
    assert.notStrictEqual(e, null);
  }

});

const objectPath1 = path.join(process.cwd(), './test-data/ocfl-object1');
const sourcePath1 = path.join(process.cwd(), './test-data/ocfl-object1-source');


describe ('version numbering', function() {
    //Helper functions
    const object = new OcflObject();

    it("should know how to increment versions", function() {
        assert.strictEqual("v1", object.getVersionString(1));
        assert.strictEqual("v100", object.getVersionString(100));
    });
    //Can tell what version of content is in a repository
})


describe('object with content imported from an existing directory', async function () {
  const object = new OcflObject();
  const objectPath1 = path.join(process.cwd(), './test-data/ocfl-object1');
  const inventoryPath1 = path.join(objectPath1, 'inventory.json');
  const inventoryPath1_v1 = path.join(objectPath1, 'v1', 'inventory.json');
  const repeatedFileHash = "31bca02094eb78126a517b206a88c73cfa9ec6f704c7030d18212cace820f025f00bf0ea68dbf3f3a5436ca63b53bf7bf80ad8d5de7d8359d0b7fed9dbc3ab99"
  const file1Hash = "4dff4ea340f0a823f15d3f4f01ab62eae0e5da579ccb851f8db9dfe84c58b2b37b89903a740e1ee172da793a6e79d560e5f7f9bd058a12a280433ed6fa46510a"
  const id = "some_id";
  createDirectory(objectPath1);
  
  it('can create an object by importing an existing directory', async function () {
    await object.create(objectPath1);
    await object.importDir("some_id", sourcePath1);
    assert.strictEqual(object.ocflVersion, '1.0');
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
      expect(path.join(objectPath1, 'v1')).to.be.a.directory("v1 dir");
  });

  it('should be version 1', function () {
    assert.strictEqual(object.contentVersion, "v1");
  });

  const contentPath = path.join(objectPath1, 'v1', 'content');

  it('should have a v1/content dir', function () {
  //create this test path
    expect(contentPath).to.be.a.directory("v1/content dir");
  });

  it('should have a manifest (inventory)', function () {
  //create this test path
    expect(inventoryPath1).to.be.a.file("inventory.json is a file");
  });

  it("object has same directory structure as source", function () {
    expect(contentPath).to.to.be.a.directory().and.deep.equal(sourcePath1, "ocfl content has original directory structure");
  });   

  it("has copied all the contents of the source to the object", function () {
    expect(sourcePath1).to.be.a.directory("is a dir").with.deep.files.that.satisfy((files) => {
      return files.every((file) => {
        const fixture_file = path.join(sourcePath1, file);
        const output_file = path.join(contentPath, file);
        expect(output_file).to.be.a.file(`file ${output_file}`).and.equal(fixture_file, `${output_file} content matches`);
        return true;
      })
    })
  });

  // either the magic number here is wrong or there are some missing files in the
  // test fixture

  it.skip(`should have a manifest (inventory) with 209 items in it`, async function () {
      const inv = await JSON.parse(fs.readFile(inventoryPath1));
      assert.strictEqual(Object.keys(inv.manifest).length, 209);
  });


  it('should have file1.txt ', async function() {
    const inv = await JSON.parse(fs.readFileSync(inventoryPath1));
    assert.strictEqual(inv.manifest[file1Hash][0],"v1/content/sample/lots_of_little_files/file_1.txt");
    assert.strictEqual(inv.versions["v1"].state[file1Hash][0], "sample/lots_of_little_files/file_1.txt");
  });
  
  it('should list 1 copies of file with same content in the manifest and 4 in v1', async function() {
    const inv = await JSON.parse(fs.readFileSync(inventoryPath1));
    assert.strictEqual(inv.manifest[repeatedFileHash].length, 1);
    assert.strictEqual(inv.versions["v1"].state[repeatedFileHash].length,4);
  });

    
  it('should have an inventory digest file', function () {
    assert.strictEqual(fs.existsSync(inventoryPath1 + '.sha512'), true);
  });
   
  it('should have a V1 inventory file', function () {
    assert.strictEqual(fs.existsSync(path.join(objectPath1, "v1",  'inventory.json')), true);
  });

  it('should have a V1 inventory digest file', function () {
    assert.strictEqual(fs.existsSync(path.join(objectPath1, "v1",  'inventory.json.sha512')), true);
  }); 


  after(async function () {
    //TODO: destroy test objPath
    //fs.removeSync(objectPath);
    await fs.remove(objectPath1);
  });
     
  

});


describe('object with content added by a callback', async function () {
  const object = new OcflObject();
  const objectPath1 = path.join(process.cwd(), './test-data/ocfl-object1');
  const inventoryPath1 = path.join(objectPath1, 'inventory.json');
  const inventoryPath1_v1 = path.join(objectPath1, 'v1', 'inventory.json');
  const id = "some_id";

  const CONTENT = {
    'dir/file1.txt': 'Contents of file1.txt',
    'dir/file2.txt': 'Contents of file2.txt',
    'file3.txt': 'Contents of file3.txt'
  };




  const makeContent = async (dir) => {
    const files = Object.keys(CONTENT);
    for( const f of files ) {
      const d = path.join(dir, path.dirname(f));
      await fs.ensureDir(d);
      await fs.writeFile(path.join(dir, f), CONTENT[f]);
    }
  };

  
  it('can create an object with a callback that writes to the directory', async function () {
    createDirectory(objectPath1);
    await object.create(objectPath1);
    await object.addContent("some_id", makeContent);
    assert.strictEqual(object.ocflVersion, '1.0');
  });


  it('should have the content generated by the callback', async function () {
    const files = Object.keys(CONTENT);
    for( const f of files ) {
      const ocflf = path.join(objectPath1, 'v1/content', f);
      expect(ocflf).to.be.a.file(`${ocflf} is a file`).with.content(CONTENT[f]);
    }
  })
  
  it('should have a manifest entry for each file with the correct hash', async function () {
    const files = Object.keys(CONTENT);
    const inv = await fs.readJSON(inventoryPath1);
    const manifest = inv.manifest;
    for( const f of files ) {
      const ocflf = path.join(objectPath1, 'v1/content', f);
      expect(ocflf).to.be.a.file(`${ocflf} is a file`).with.content(CONTENT[f]);
      const h = await hasha.fromFile(ocflf, { algorithm: DIGEST_ALGORITHM });
      expect(manifest[h][0]).to.equal(path.join('v1/content', f));
      delete manifest[h];
    }
    expect(manifest).to.be.empty;
  })


  // it('should have file1.txt ', async function() {
  //   const inv = await JSON.parse(fs.readFileSync(inventoryPath1));
  //   assert.strictEqual(inv.manifest[file1Hash][0],"v1/content/sample/lots_of_little_files/file_1.txt");
  //   assert.strictEqual(inv.versions["v1"].state[file1Hash][0], "sample/lots_of_little_files/file_1.txt");
  // });
  
  // it('should list 1 copies of file with same content in the manifest and 4 in v1', async function() {
  //   const inv = await JSON.parse(fs.readFileSync(inventoryPath1));
  //   assert.strictEqual(inv.manifest[repeatedFileHash].length, 1);
  //   assert.strictEqual(inv.versions["v1"].state[repeatedFileHash].length,4);
  // });

    
  it('should have an inventory digest file', function () {
    assert.strictEqual(fs.existsSync(inventoryPath1 + '.sha512'), true);
  });
   
  it('should have a V1 inventory file', function () {
    assert.strictEqual(fs.existsSync(path.join(objectPath1, "v1",  'inventory.json')), true);
  });

  it('should have a V1 inventory digest file', function () {
    assert.strictEqual(fs.existsSync(path.join(objectPath1, "v1",  'inventory.json.sha512')), true);
  }); 
     
  after(async function () {
    //TODO: destroy test objPath
    //fs.removeSync(objectPath);
    await fs.remove(objectPath1);
  });




});





