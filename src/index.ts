import * as core from "@actions/core";
import { readInputs } from "./_inputs.js";
import { runUntag } from "./_untag.js";

async function main(): Promise<void> {
  const inputs = readInputs();
  await runUntag(inputs.owner, inputs.packageName, inputs.tags, {
    token: inputs.token,
    logger: {
      debug: core.debug,
      info: core.info,
      warn: core.warning
    }
  });
}

void main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
