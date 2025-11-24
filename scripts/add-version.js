const fs = require("fs");
const path = require("path");

const version = process.argv[2];
const src = process.argv[3];

if (!version || !src) {
  console.error("Usage: node add-version.js <version> <source-file>");
  process.exit(1);
}

if (!fs.existsSync(src)) {
  console.error(`Source file does not exist: ${src}`);
  process.exit(1);
}

const [major, minor] = version.split(".");
const minorAlias = `${major}.${minor}.x`;

const dist = path.join(__dirname, "..", "dist");
const versionDir = path.join(dist, `v${version}`);
const aliasDir = path.join(dist, minorAlias);
const latestDir = path.join(dist, "latest");

// Create directories if they don't exist
[versionDir, aliasDir, latestDir].forEach((d) =>
  fs.mkdirSync(d, { recursive: true })
);

// Copy file to versioned directories
fs.copyFileSync(src, path.join(versionDir, "dm-js-lib.min.js"));
fs.copyFileSync(src, path.join(aliasDir, "dm-js-lib.min.js"));
fs.copyFileSync(src, path.join(latestDir, "dm-js-lib.min.js"));

console.log(`✓ Added version ${version} to dist folders`);
console.log(`  - ${versionDir}/dm-js-lib.min.js`);
console.log(`  - ${aliasDir}/dm-js-lib.min.js`);
console.log(`  - ${latestDir}/dm-js-lib.min.js`);

