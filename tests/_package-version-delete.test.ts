import assert from "node:assert/strict";
import test from "node:test";
import { deletePackageVersion } from "../src/_package-version-delete.js";

test("deletePackageVersion deletes through the resolved owner endpoint", async () => {
  const seenUrls: string[] = [];

  await deletePackageVersion("acme", "example", 42, {
    token: "token",
    logger: _logger(),
    fetchImpl: async (input, init) => {
      const url = String(input);
      seenUrls.push(url);

      if (url === "https://api.github.com/users/acme") {
        return _jsonResponse({ type: "Organization" });
      }

      assert.equal(url, "https://api.github.com/orgs/acme/packages/container/example/versions/42");
      assert.equal(init?.method, "DELETE");
      return {
        ok: true,
        status: 204,
        headers: new Headers(),
        async json() {
          return {};
        }
      };
    }
  });

  assert.deepEqual(seenUrls, [
    "https://api.github.com/users/acme",
    "https://api.github.com/orgs/acme/packages/container/example/versions/42"
  ]);
});

test("deletePackageVersion surfaces non-ok responses", async () => {
  await assert.rejects(
    () =>
      deletePackageVersion("acme", "example", 42, {
        token: "token",
        logger: _logger(),
        fetchImpl: async (input) => {
          if (String(input) === "https://api.github.com/users/acme") {
            return _jsonResponse({ type: "Organization" });
          }

          return {
            ok: false,
            status: 403,
            headers: new Headers({ "content-type": "application/json" }),
            async json() {
              return { message: "forbidden" };
            }
          };
        }
      }),
    /GitHub package delete request failed for version 42 - status 403 - forbidden/
  );
});

function _jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    async json() {
      return body;
    }
  };
}

function _logger() {
  return {
    debug() {},
    info() {},
    warn() {}
  };
}
