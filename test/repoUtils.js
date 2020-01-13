
const fs = require("fs-extra");


const Repository = require("../lib/repository");


async function createTestRepo(repositoryPath) {
  await fs.remove(repositoryPath);
  await fs.ensureDir(repositoryPath);
  const repository = new Repository();
  const init = await repository.create(repositoryPath);
  return repository;
}


module.exports = {
	createTestRepo: createTestRepo
};