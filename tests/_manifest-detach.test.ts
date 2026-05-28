import assert from "node:assert/strict";
import test from "node:test";
import { buildDetachedManifestClone } from "../src/_manifest-detach.js";

test("buildDetachedManifestClone adds a detach annotation for OCI manifests", () => {
  const manifest = JSON.stringify({
    mediaType: "application/vnd.oci.image.manifest.v1+json",
    config: {
      mediaType: "application/vnd.oci.image.config.v1+json",
      digest: "sha256:config",
      size: 10
    },
    layers: []
  });

  const clone = buildDetachedManifestClone(manifest, "application/vnd.oci.image.manifest.v1+json", {
    detachedTag: "latest",
    sourceDigest: "sha256:source"
  });

  assert.match(clone, /io\.github\.ghcr-manager\.detached-tag/);
  assert.match(clone, /latest sha256:source/);
});

test("buildDetachedManifestClone keeps docker manifests schema-equivalent", () => {
  const manifest = JSON.stringify({
    schemaVersion: 2,
    mediaType: "application/vnd.docker.distribution.manifest.v2+json",
    config: {
      mediaType: "application/vnd.docker.container.image.v1+json",
      digest: "sha256:config",
      size: 10
    },
    layers: []
  });

  const clone = buildDetachedManifestClone(manifest, "application/vnd.docker.distribution.manifest.v2+json", {
    detachedTag: "latest",
    sourceDigest: "sha256:source"
  });

  assert.notEqual(clone, manifest);
  assert.equal(JSON.parse(clone).schemaVersion, 2);
  assert.equal(JSON.parse(clone).annotations, undefined);
});

test("buildDetachedManifestClone rejects non-object manifests", () => {
  assert.throws(
    () =>
      buildDetachedManifestClone("[]", "application/vnd.oci.image.manifest.v1+json", {
        detachedTag: "latest",
        sourceDigest: "sha256:source"
      }),
    /manifest sha256:source is not a JSON object/
  );
});
