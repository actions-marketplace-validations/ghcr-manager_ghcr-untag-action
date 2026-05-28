#!/usr/bin/env node
/* global fetch, process, URL */

const owner = process.argv[2];
const packageName = process.argv[3];
const token = process.argv[4];
const keepTag = process.argv[5];
const deleteTag = process.argv[6];

if (!owner || !packageName || !token || !keepTag || !deleteTag) {
  throw new Error(
    "usage: node tools/tests/assert-live-untag-tags.mjs <owner> <package-name> <token> <keep-tag> <delete-tag>"
  );
}

const ownerPathSegment = await loadOwnerPathSegment(owner, token);
const tags = await listPackageTags(ownerPathSegment, owner, packageName, token);

if (!tags.has(keepTag)) {
  throw new Error(`expected keep tag '${keepTag}' to remain on ${owner}/${packageName}`);
}
if (tags.has(deleteTag)) {
  throw new Error(`expected delete tag '${deleteTag}' to be absent on ${owner}/${packageName}`);
}

process.stdout.write(
  `Verified ${owner}/${packageName}: keep tag '${keepTag}' remains and delete tag '${deleteTag}' is absent.\n`
);

async function loadOwnerPathSegment(ownerName, authToken) {
  const url = new URL(`/users/${encodeURIComponent(ownerName)}`, "https://api.github.com").toString();
  const response = await fetch(url, {
    headers: buildHeaders(authToken)
  });
  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, `failed to load owner ${ownerName}`));
  }

  const payload = await response.json();
  if (payload !== null && typeof payload === "object" && payload.type === "Organization") {
    return "orgs";
  }
  if (payload !== null && typeof payload === "object" && payload.type === "User") {
    return "users";
  }
  throw new Error(`unsupported owner type for ${ownerName}`);
}

async function listPackageTags(ownerPathSegment, ownerName, packageNameValue, authToken) {
  const tags = new Set();

  for (let page = 1; ; page += 1) {
    const url = new URL(
      `/${ownerPathSegment}/${encodeURIComponent(ownerName)}/packages/container/${encodeURIComponent(packageNameValue)}/versions`,
      "https://api.github.com"
    );
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      headers: buildHeaders(authToken)
    });
    if (response.status === 404) {
      throw new Error(`package ${ownerName}/${packageNameValue} was not found`);
    }
    if (!response.ok) {
      throw new Error(
        await buildErrorMessage(response, `failed to list package versions for ${ownerName}/${packageNameValue}`)
      );
    }

    const items = await response.json();
    if (!Array.isArray(items) || items.length === 0) {
      return tags;
    }

    for (const item of items) {
      const itemTags = item?.metadata?.container?.tags;
      if (!Array.isArray(itemTags)) {
        continue;
      }
      for (const tag of itemTags) {
        if (typeof tag === "string") {
          tags.add(tag);
        }
      }
    }

    if (items.length < 100) {
      return tags;
    }
  }
}

function buildHeaders(authToken) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${authToken}`,
    "User-Agent": "ghcr-untag-action",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function buildErrorMessage(response, fallback) {
  let body;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const message =
    body !== null && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message
      : "unknown error";
  return `${fallback}: status ${response.status} - ${message}`;
}
