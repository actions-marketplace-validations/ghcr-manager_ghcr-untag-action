import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHttpErrorMessage,
  buildTransportErrorMessage,
  isRetryableStatus,
  resolveFetch,
  resolveJsonContentType,
  runWithRetry
} from "../src/_http.js";

test("isRetryableStatus recognizes transient HTTP statuses", () => {
  assert.equal(isRetryableStatus(429), true);
  assert.equal(isRetryableStatus(503), true);
  assert.equal(isRetryableStatus(404), false);
});

test("buildTransportErrorMessage includes the fallback and original message", () => {
  const message = buildTransportErrorMessage(new Error("fetch failed"), "GHCR request failed");
  assert.equal(message, "GHCR request failed - fetch failed");
});

test("buildTransportErrorMessage stringifies non-Error values", () => {
  const message = buildTransportErrorMessage("fetch failed", "GHCR request failed");
  assert.equal(message, "GHCR request failed - fetch failed");
});

test("resolveJsonContentType strips content-type parameters", () => {
  const contentType = resolveJsonContentType({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json; charset=utf-8" }),
    async json() {
      return {};
    }
  });

  assert.equal(contentType, "application/json");
});

test("resolveFetch falls back to the global fetch implementation", () => {
  assert.equal(resolveFetch(undefined), fetch);
});

test("buildHttpErrorMessage includes structured JSON details", async () => {
  const message = await buildHttpErrorMessage(
    {
      ok: false,
      status: 401,
      headers: new Headers({
        "content-type": "application/json",
        "www-authenticate": 'Bearer realm="ghcr"'
      }),
      async json() {
        return {
          message: "bad token",
          documentation_url: "https://docs.example.test/auth"
        };
      }
    },
    "request failed"
  );

  assert.equal(
    message,
    'request failed - status 401 - bad token - https://docs.example.test/auth - www-authenticate: Bearer realm="ghcr"'
  );
});

test("buildHttpErrorMessage ignores non-json bodies", async () => {
  const message = await buildHttpErrorMessage(
    {
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "text/plain" }),
      async json() {
        throw new Error("should not parse");
      }
    },
    "request failed"
  );

  assert.equal(message, "request failed - status 500");
});

test("runWithRetry retries retryable failures", async () => {
  const warnings: string[] = [];
  let attempts = 0;

  const result = await runWithRetry("GHCR request", _logger(warnings), async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error("status 503");
    }
    return "ok";
  });

  assert.equal(result, "ok");
  assert.equal(attempts, 2);
  assert.match(warnings[0] ?? "", /attempt 1\/4/);
});

test("runWithRetry stops on non-retryable failures", async () => {
  await assert.rejects(
    () =>
      runWithRetry("GHCR request", _logger([]), async () => {
        throw new Error("status 400");
      }),
    /status 400/
  );
});

function _logger(warnings: string[]) {
  return {
    debug() {},
    info() {},
    warn(message: string) {
      warnings.push(message);
    }
  };
}
