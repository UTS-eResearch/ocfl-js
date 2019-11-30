// const assert = require('assert');
// const path = require('path');
// const fs = require('fs-extra');
// const OcflObject = require('../lib/ocflObject');

// describe('from path get an object', async function () {

//   const testDataPath = path.join(process.cwd(), 'test-data', 'streams');
//   fs.removeSync(testDataPath);
//   fs.ensureDirSync(testDataPath);

//   const sampleDir = path.join(testDataPath, 'sample');
//   fs.removeSync(sampleDir);
//   fs.ensureDirSync(sampleDir);

//   const fileName = 'ojbectFromPath.json';
//   const filePath = path.join(sampleDir, fileName);

//   it('should get a file path from OcflObject', async function () {
//     try {
//       //create test-file
//       const objPath = path.join(testDataPath, 'obj');
//       fs.ensureDirSync(objPath);
//       fs.writeFileSync(filePath, '{what:{is:{a:"test"}}}');
//       const obj = new OcflObject();
//       const objIni = await obj.create(objPath);
//       //add content
//       const initWithContent = await obj.importDir("some_id", sampleDir);
//       //compare object
//       //path relative to the object
//       const objFilePath = await obj.getFilePath(fileName);
//       const readFile = await fs.readFile(path.join(objPath, objFilePath));
//       const content = readFile.toString();
//       assert.strictEqual('{what:{is:{a:"test"}}}', content);
//     } catch (e) {
//       assert.fail(e.message);
//       throw new Error(e);
//     }
//   });

// });

/*
  const testDataPath = path.join(process.cwd(), 'test-data', 'streams');
  const fileName = 'ojbectFromPath.json';
  const filePath = path.join(testDataPath, fileName);
  //init repo
  const repoPath = path.join(testDataPath, 'ocfl');
  fs.ensureDirSync(repoPath);

  try {
    const repo = new OcflRepository(repoPath);
    const inited = await repo.initRepo();
  }
  catch (e) {
    throw new Error(e);
  }
*/
