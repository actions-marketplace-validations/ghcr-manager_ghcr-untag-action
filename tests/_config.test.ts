import assert from "node:assert/strict";
import test from "node:test";
import {
  ghcrRegistryBaseUrl,
  githubApiBaseUrl,
  githubApiVersion,
  requestRetryCount,
  requestRetryDelayMs
} from "../src/_config.js";

test("config exports expected fixed service values", () => {
  assert.equal(githubApiBaseUrl.toString(), "https://api.github.com/");
  assert.equal(ghcrRegistryBaseUrl.toString(), "https://ghcr.io/");
  assert.equal(githubApiVersion, "2022-11-28");
  assert.equal(requestRetryCount, 3);
  assert.equal(requestRetryDelayMs, 1000);
});
