import assert from "node:assert/strict";
import test from "node:test";
import { loadRegistryPushToken } from "../src/_registry-token.js";

test("loadRegistryPushToken requests a registry push token", async () => {
  const token = await loadRegistryPushToken("acme", "example", {
    token: "github-token",
    logger: _logger(),
    fetchImpl: async (input, init) => {
      assert.equal(
        String(input),
        "https://ghcr.io/token?service=ghcr.io&scope=repository%3Aacme%2Fexample%3Apull%2Cpush"
      );
      assert.match(
        String(
          init?.headers instanceof Headers
            ? init.headers.get("authorization")
            : (init?.headers as Record<string, string>).Authorization
        ),
        /^Basic /
      );
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        async json() {
          return { token: "registry-token" };
        }
      };
    }
  });

  assert.equal(token, "registry-token");
});

test("loadRegistryPushToken requires a token in the response body", async () => {
  await assert.rejects(
    () =>
      loadRegistryPushToken("acme", "example", {
        token: "github-token",
        logger: _logger(),
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          async json() {
            return {};
          }
        })
      }),
    /did not include a token/
  );
});

test("loadRegistryPushToken surfaces non-ok responses", async () => {
  await assert.rejects(
    () =>
      loadRegistryPushToken("acme", "example", {
        token: "github-token",
        logger: _logger(),
        fetchImpl: async () => ({
          ok: false,
          status: 401,
          headers: new Headers({ "content-type": "application/json" }),
          async json() {
            return { message: "bad credentials" };
          }
        })
      }),
    /GHCR token request failed - status 401 - bad credentials/
  );
});

function _logger() {
  return {
    debug() {},
    info() {},
    warn() {}
  };
}
