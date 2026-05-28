import assert from "node:assert/strict";
import test from "node:test";
import { putRegistryManifestForTag } from "../src/_registry-manifest-put.js";

test("putRegistryManifestForTag uploads a manifest for the requested tag", async () => {
  const digest = await putRegistryManifestForTag(
    "acme",
    "example",
    "latest",
    "application/vnd.oci.image.manifest.v1+json",
    '{"mediaType":"application/vnd.oci.image.manifest.v1+json"}',
    "registry-token",
    _logger(),
    {
      fetchImpl: async (input, init) => {
        assert.equal(String(input), "https://ghcr.io/v2/acme/example/manifests/latest");
        assert.equal(init?.method, "PUT");
        return {
          ok: true,
          status: 201,
          headers: new Headers(),
          async json() {
            return {};
          }
        };
      }
    }
  );

  assert.match(digest, /^sha256:[0-9a-f]{64}$/);
});

test("putRegistryManifestForTag rejects non-ok responses", async () => {
  await assert.rejects(
    () =>
      putRegistryManifestForTag(
        "acme",
        "example",
        "latest",
        "application/vnd.oci.image.manifest.v1+json",
        "{}",
        "registry-token",
        _logger(),
        {
          fetchImpl: async () => ({
            ok: false,
            status: 400,
            headers: new Headers({ "content-type": "application/json" }),
            async json() {
              return { message: "bad manifest" };
            }
          })
        }
      ),
    /GHCR manifest put request for tag latest failed - status 400 - bad manifest/
  );
});

function _logger() {
  return {
    debug() {},
    info() {},
    warn() {}
  };
}
