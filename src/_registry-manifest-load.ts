import { ghcrRegistryBaseUrl } from "./_config.js";
import {
  buildHttpErrorMessage,
  buildTransportErrorMessage,
  isRetryableStatus,
  resolveFetch,
  resolveJsonContentType,
  runWithRetry
} from "./_http.js";
import type { LoadedRegistryManifest, Logger, UntagOptions } from "./_types.js";

const _ACCEPTED_MANIFEST_MEDIA_TYPES = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.docker.distribution.manifest.v2+json",
  "application/vnd.oci.artifact.manifest.v1+json"
].join(", ");

export async function loadRegistryManifestByDigest(
  owner: string,
  packageName: string,
  digest: string,
  registryToken: string,
  logger: Logger,
  options?: Pick<UntagOptions, "fetchImpl">
): Promise<LoadedRegistryManifest> {
  const fetchImpl = resolveFetch(options?.fetchImpl);
  const url = new URL(`/v2/${owner}/${packageName}/manifests/${digest}`, ghcrRegistryBaseUrl);

  let response;
  try {
    response = await runWithRetry(`GHCR manifest request for ${digest}`, logger, async () => {
      const manifestResponse = await fetchImpl(url.toString(), {
        headers: {
          Accept: _ACCEPTED_MANIFEST_MEDIA_TYPES,
          Authorization: `Bearer ${registryToken}`,
          "User-Agent": "ghcr-untag-action"
        }
      });
      if (!manifestResponse.ok && isRetryableStatus(manifestResponse.status)) {
        throw new Error(await buildHttpErrorMessage(manifestResponse, `GHCR manifest request for ${digest} failed`));
      }
      return manifestResponse;
    });
  } catch (error) {
    throw new Error(buildTransportErrorMessage(error, `GHCR manifest request for ${digest} failed`), { cause: error });
  }

  if (!response.ok) {
    throw new Error(await buildHttpErrorMessage(response, `GHCR manifest request for ${digest} failed`));
  }

  const document = (await response.json()) as { mediaType?: string };
  const mediaType = document.mediaType ?? resolveJsonContentType(response);
  if (!mediaType) {
    throw new Error(`manifest response for ${digest} did not include a media type`);
  }

  return {
    digest,
    mediaType,
    rawJson: JSON.stringify(document)
  };
}
