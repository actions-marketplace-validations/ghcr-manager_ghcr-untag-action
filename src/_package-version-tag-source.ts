import { resolveFetch } from "./_http.js";
import { loadPackageVersionPage } from "./_package-version-page.js";
import type { TagSource, UntagOptions } from "./_types.js";

export async function listPackageVersionTagSources(
  owner: string,
  packageName: string,
  tags: string[],
  options: UntagOptions
): Promise<TagSource[]> {
  const fetchImpl = resolveFetch(options.fetchImpl);
  const requestedTags = [...new Set(tags)];
  if (requestedTags.length === 0) {
    return [];
  }

  const requestedTagSet = new Set(requestedTags);
  const matches = new Map<string, TagSource>();

  for (let page = 1; ; page += 1) {
    const items = await loadPackageVersionPage(owner, packageName, page, options.token, options.logger, fetchImpl);
    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const itemTags = item.metadata?.container?.tags;
      if (!Array.isArray(itemTags) || typeof item.name !== "string") {
        continue;
      }

      for (const tag of itemTags) {
        if (!requestedTagSet.has(tag) || matches.has(tag)) {
          continue;
        }

        matches.set(tag, {
          tag,
          sourceVersionId: item.id,
          sourceDigest: item.name
        });
      }
    }

    if (matches.size === requestedTags.length || items.length < 100) {
      break;
    }
  }

  return requestedTags.flatMap((tag) => {
    const match = matches.get(tag);
    return match ? [match] : [];
  });
}

export async function listPresentPackageVersionIds(
  owner: string,
  packageName: string,
  versionIds: number[],
  options: UntagOptions
): Promise<number[]> {
  const fetchImpl = resolveFetch(options.fetchImpl);
  const requestedVersionIds = [...new Set(versionIds)];
  if (requestedVersionIds.length === 0) {
    return [];
  }

  const requestedVersionIdSet = new Set(requestedVersionIds);
  const matches = new Set<number>();

  for (let page = 1; ; page += 1) {
    const items = await loadPackageVersionPage(owner, packageName, page, options.token, options.logger, fetchImpl);
    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      if (requestedVersionIdSet.has(item.id)) {
        matches.add(item.id);
      }
    }

    if (matches.size === requestedVersionIds.length || items.length < 100) {
      break;
    }
  }

  return requestedVersionIds.filter((versionId) => matches.has(versionId));
}
