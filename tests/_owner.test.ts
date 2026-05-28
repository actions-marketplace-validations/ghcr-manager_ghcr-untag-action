import assert from "node:assert/strict";
import test from "node:test";
import { getOwnerUriComponent } from "../src/_owner.js";

test("getOwnerUriComponent resolves organization owners", async () => {
  const ownerUriComponent = await getOwnerUriComponent(
    async (input) => {
      assert.equal(input, "https://api.github.com/users/acme");
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        async json() {
          return { type: "Organization" };
        }
      };
    },
    "acme",
    "token",
    _logger()
  );

  assert.equal(ownerUriComponent, "orgs/acme");
});

test("getOwnerUriComponent resolves user owners", async () => {
  const ownerUriComponent = await getOwnerUriComponent(
    async (input) => {
      assert.equal(input, "https://api.github.com/users/wuodan");
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        async json() {
          return { type: "User" };
        }
      };
    },
    "wuodan",
    "token",
    _logger()
  );

  assert.equal(ownerUriComponent, "users/wuodan");
});

test("getOwnerUriComponent rejects unsupported owner types", async () => {
  await assert.rejects(
    () =>
      getOwnerUriComponent(
        async () => ({
          ok: true,
          status: 200,
          headers: new Headers(),
          async json() {
            return { type: "Bot" };
          }
        }),
        "robot",
        "token",
        _logger()
      ),
    /supported type/
  );
});

test("getOwnerUriComponent surfaces non-retryable http failures", async () => {
  await assert.rejects(
    () =>
      getOwnerUriComponent(
        async () => ({
          ok: false,
          status: 404,
          headers: new Headers({ "content-type": "application/json" }),
          async json() {
            return { message: "not found" };
          }
        }),
        "missing",
        "token",
        _logger()
      ),
    /GitHub owner lookup failed - status 404 - not found/
  );
});

function _logger() {
  return {
    debug() {},
    info() {},
    warn() {}
  };
}
