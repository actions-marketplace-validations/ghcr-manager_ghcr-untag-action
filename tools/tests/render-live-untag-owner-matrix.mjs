#!/usr/bin/env node
/* global process */

import { liveUntagScenarios } from "./live-untag-scenarios/_definitions.mjs";

const scenarioId = process.argv[2];
const orgOwner = process.argv[3];
const userOwner = process.argv[4];
const scenarioIds =
  scenarioId && scenarioId !== "all" ? [resolveScenarioId(scenarioId)] : Object.keys(liveUntagScenarios);

if (!orgOwner || !userOwner) {
  throw new Error("usage: node tools/tests/render-live-untag-owner-matrix.mjs <scenario|all> <org-owner> <user-owner>");
}

process.stdout.write(
  JSON.stringify({
    include: scenarioIds.flatMap((scenario) => [
      { owner: orgOwner, scenario },
      { owner: userOwner, scenario }
    ])
  })
);

function resolveScenarioId(value) {
  if (!liveUntagScenarios[value]) {
    throw new Error(`unknown live untag scenario: ${value}`);
  }

  return value;
}
