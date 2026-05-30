import * as core from "@actions/core";
import { readInputs } from "./_inputs.js";
import type { Logger } from "./_types.js";
import { runUntag } from "./_untag.js";

async function main(): Promise<void> {
  const inputs = readInputs();
  await runUntag(inputs.owner, inputs.packageName, inputs.tags, {
    token: inputs.token,
    logger: createLogger(inputs.logLevel)
  });
}

void main().catch((error) => {
  if (error instanceof Error) {
    core.error(error.stack ?? error.message);
    core.setFailed(error.message);
    return;
  }

  core.setFailed(String(error));
});

function createLogger(logLevel: "warn" | "info" | "debug"): Logger {
  const threshold = _resolveLogLevelThreshold(logLevel);

  return {
    debug(message) {
      if (threshold >= 3) {
        core.debug(message);
      }
    },
    info(message) {
      if (threshold >= 2) {
        core.info(message);
      }
    },
    warn(message) {
      if (threshold >= 1) {
        core.warning(message);
      }
    }
  };
}

function _resolveLogLevelThreshold(logLevel: "warn" | "info" | "debug"): number {
  switch (logLevel) {
    case "warn":
      return 1;
    case "info":
      return 2;
    case "debug":
      return 3;
  }
}
