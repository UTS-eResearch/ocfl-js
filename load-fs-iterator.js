const path = require('path');
const fs = require('fs-extra');
const assert = require("assert");
const { program } = require('commander');
const { performance, PerformanceObserver } = require("perf_hooks")
const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(entry);
  })
});
perfObserver.observe({ entryTypes: ["measure"], buffer: true });

const OCFLRepository = require('.').Repository;


(async () => {


  program.option('-r, --repo-path <type>', 'Path to OCFL repository')
  program.parse(process.argv);
  const opts = program.opts();
  const ocflRoot = opts.repoPath;
  assert(await fs.pathExists(ocflRoot), `path: ${ocflRoot} : does not exist cannot connect`);

  performance.mark("start");
  const repo = new OCFLRepository();
  console.log(`Started loading objects`);
  await repo.load(ocflRoot);

  const objectList = await repo.objects();
  
  console.log(objectList.length);
  console.log(`Finished loading objects`);
  performance.mark("end");
  performance.measure("uts-load", "start", "end");

  
})();
