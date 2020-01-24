// utilities for ocfl tests

const path = require("path");
const fs = require("fs-extra");
const hasha = require("hasha");

const DIGEST_ALGORITHM = 'sha512';



async function collectUniqueFiles(dir) {
	const hashes = {};
	const contents = await fs.readdir(dir);
	for( var p of contents ) {
		const ap = path.join(dir, p);
		const st = await fs.stat(ap);
		if( st.isDirectory() ) {
			const subhashes = await collectUniqueFiles(ap);
			for( var h in subhashes ) {
				if( h in hashes ) {
					hashes[h].push(...subhashes[h]);
				} else {
					hashes[h] = subhashes[h];
				}
			}
		} else {
			const h = await hasha.fromFile(ap, { algorithm: DIGEST_ALGORITHM });
			if( h in hashes ) {
				hashes[h].push(ap);
			} else {
				hashes[h] = [ ap ];
			}
		}
	}
	return hashes;
}

async function countUniqueFiles(dir) {
	const hashes = await collectUniqueFiles(dir);
	return Object.keys(hashes).length;
}


module.exports = {
	collectUniqueFiles: collectUniqueFiles,
	countUniqueFiles: countUniqueFiles
};