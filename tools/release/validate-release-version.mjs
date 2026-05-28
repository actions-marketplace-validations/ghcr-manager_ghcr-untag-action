#!/usr/bin/env node
/* global process */

const version = process.argv[2] ?? "";
const refName = process.argv[3] ?? "";
const defaultBranch = process.argv[4] ?? "";

if (!/^v\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`release version must match v<major>.<minor>.<patch>; received '${version}'`);
}

if (refName !== defaultBranch) {
  throw new Error(`releases must run from '${defaultBranch}'; received '${refName}'`);
}

const [, major, minor] = /^v(\d+)\.(\d+)\.(\d+)$/.exec(version) ?? [];

if (!major || !minor) {
  throw new Error(`failed to derive short tags from '${version}'`);
}

process.stdout.write(
  JSON.stringify({
    fullTag: version,
    majorTag: `v${major}`,
    minorTag: `v${major}.${minor}`
  })
);
