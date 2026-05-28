#!/usr/bin/env node
/* global process */

import { liveUntagScenarios } from "./live-untag-scenarios/_definitions.mjs";

const owner = process.argv[2];
const scenarioId = process.argv[3];
const repositoryName = process.argv[4];

if (!scenarioId || !repositoryName || !owner) {
  throw new Error("usage: node tools/tests/resolve-live-untag-scenario.mjs <owner> <scenario> <repository-name>");
}

const scenario = liveUntagScenarios[scenarioId];
if (!scenario) {
  throw new Error(`unknown live untag scenario: ${scenarioId}`);
}

const tagNames = Object.fromEntries(
  Object.entries(scenario.tagNames ?? {}).map(([key, value]) => [key, `${scenario.id}--${value}`])
);

process.stdout.write(
  JSON.stringify({
    scenarioId: scenario.id,
    seedStrategy: scenario.seedStrategy,
    packageName: `${repositoryName}-${scenario.packageSuffix}`,
    owner,
    imageRef: `ghcr.io/${owner}/${repositoryName}-${scenario.packageSuffix}`,
    tagNames,
    deleteTags: tagNames.deleteTag ? [tagNames.deleteTag] : []
  })
);
