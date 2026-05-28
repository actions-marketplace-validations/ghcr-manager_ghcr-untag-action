import { githubApiBaseUrl, githubApiVersion } from "./_config.js";
import { buildHttpErrorMessage, buildTransportErrorMessage, isRetryableStatus, runWithRetry } from "./_http.js";
import { getOwnerUriComponent } from "./_owner.js";
import type { FetchLike, Logger, PackageVersionPageItem } from "./_types.js";

export async function loadPackageVersionPage(
  owner: string,
  packageName: string,
  page: number,
  token: string,
  logger: Logger,
  fetchImpl: FetchLike
): Promise<PackageVersionPageItem[]> {
  const ownerUriComponent = await getOwnerUriComponent(fetchImpl, owner, token, logger);
  const url = new URL(
    `/${ownerUriComponent}/packages/container/${encodeURIComponent(packageName)}/versions`,
    githubApiBaseUrl
  );
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", String(page));

  let response;
  try {
    response = await runWithRetry(`GitHub Packages request for page ${page}`, logger, async () => {
      const pageResponse = await fetchImpl(url.toString(), {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "ghcr-untag-action",
          "X-GitHub-Api-Version": githubApiVersion
        }
      });
      if (!pageResponse.ok && isRetryableStatus(pageResponse.status)) {
        throw new Error(await buildHttpErrorMessage(pageResponse, `GitHub Packages request for page ${page} failed`));
      }
      return pageResponse;
    });
  } catch (error) {
    throw new Error(buildTransportErrorMessage(error, `GitHub Packages request for page ${page} failed`), {
      cause: error
    });
  }

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, `GitHub Packages request for page ${page} failed`));
  }

  return (await response.json()) as PackageVersionPageItem[];
}
