import { buildDetachedManifestClone } from "./_manifest-detach.js";
import { deletePackageVersion } from "./_package-version-delete.js";
import { listPackageVersionTagSources } from "./_package-version-tag-source.js";
import { loadRegistryManifestByDigest } from "./_registry-manifest-load.js";
import { putRegistryManifestForTag } from "./_registry-manifest-put.js";
import { loadRegistryPushToken } from "./_registry-token.js";
import { assertTagRemoved, assertVersionRemoved, resolveDetachedTagVersion } from "./_untag-polling.js";
import type { TagSource, UntagOperation, UntagOptions, UntagRootSelection } from "./_types.js";

export async function runUntag(
  owner: string,
  packageName: string,
  requestedTags: string[],
  options: UntagOptions
): Promise<UntagOperation[]> {
  const uniqueRequestedTags = [...new Set(requestedTags)];
  if (uniqueRequestedTags.length === 0) {
    throw new Error("at least one tag is required");
  }

  const tagSources = await listPackageVersionTagSources(owner, packageName, uniqueRequestedTags, options);
  const matchedTags = new Set(tagSources.map((tagSource) => tagSource.tag));
  const missingTags = uniqueRequestedTags.filter((tag) => !matchedTags.has(tag));
  if (missingTags.length > 0) {
    throw new Error(`could not resolve tag(s): ${missingTags.join(", ")}`);
  }

  const roots = groupTagSources(tagSources);
  const registryToken = await loadRegistryPushToken(owner, packageName, options);
  const operations: UntagOperation[] = [];
  const runtime = options.fetchImpl ? { fetchImpl: options.fetchImpl } : undefined;

  for (const root of roots) {
    const sourceManifest = await loadRegistryManifestByDigest(
      owner,
      packageName,
      root.digest,
      registryToken,
      options.logger,
      runtime
    );

    for (const tag of root.tags) {
      options.logger.info(`Detaching tag ${owner}/${packageName}:${tag} from ${root.digest}`);
      const detachedManifestJson = buildDetachedManifestClone(sourceManifest.rawJson, sourceManifest.mediaType, {
        detachedTag: tag,
        sourceDigest: root.digest
      });
      const detachedDigest = await putRegistryManifestForTag(
        owner,
        packageName,
        tag,
        sourceManifest.mediaType,
        detachedManifestJson,
        registryToken,
        options.logger,
        runtime
      );
      const detachedVersion = await resolveDetachedTagVersion(owner, packageName, tag, root, detachedDigest, options);

      await deletePackageVersion(owner, packageName, detachedVersion.sourceVersionId, options);
      await assertTagRemoved(owner, packageName, tag, options);
      await assertVersionRemoved(owner, packageName, detachedVersion.sourceVersionId, options);

      operations.push({
        tag,
        sourceVersionId: root.versionId,
        sourceDigest: root.digest,
        detachedVersionId: detachedVersion.sourceVersionId,
        detachedDigest
      });
    }
  }

  return operations;
}

export function groupTagSources(tagSources: TagSource[]): UntagRootSelection[] {
  const groups = new Map<string, UntagRootSelection>();
  for (const tagSource of tagSources) {
    const key = `${tagSource.sourceVersionId}:${tagSource.sourceDigest}`;
    const existing = groups.get(key);
    if (existing) {
      existing.tags.push(tagSource.tag);
      continue;
    }

    groups.set(key, {
      versionId: tagSource.sourceVersionId,
      digest: tagSource.sourceDigest,
      tags: [tagSource.tag]
    });
  }

  return [...groups.values()];
}
