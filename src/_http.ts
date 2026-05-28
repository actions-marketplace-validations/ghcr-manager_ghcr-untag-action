import { requestRetryCount, requestRetryDelayMs } from "./_config.js";
import type { FetchLike, FetchResponseLike, Logger } from "./_types.js";

const _RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

export function resolveFetch(fetchImpl?: FetchLike): FetchLike {
  return fetchImpl ?? fetch;
}

export function isRetryableStatus(status: number): boolean {
  return _RETRYABLE_STATUS_CODES.has(status);
}

export async function runWithRetry<T>(label: string, logger: Logger, run: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (error) {
      attempt += 1;
      if (attempt > requestRetryCount || !_shouldRetryError(error)) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        `${label} failed on attempt ${attempt}/${requestRetryCount + 1}; retrying in ${requestRetryDelayMs}ms - ${message}`
      );
      await sleep(requestRetryDelayMs);
    }
  }
}

export function buildTransportErrorMessage(error: unknown, fallback: string): string {
  const details = [fallback];
  if (error instanceof Error && error.message) {
    details.push(error.message);
  } else {
    details.push(String(error));
  }
  return details.join(" - ");
}

export function resolveJsonContentType(response: FetchResponseLike): string | undefined {
  return response.headers.get("content-type")?.split(";")[0];
}

export async function buildHttpErrorMessage(response: FetchResponseLike, fallback: string): Promise<string> {
  const details = [fallback, `status ${response.status}`];
  const body = await _readJsonErrorBody(response);
  const message = typeof body?.message === "string" ? body.message : undefined;
  const documentationUrl = typeof body?.documentation_url === "string" ? body.documentation_url : undefined;
  const authenticateHeader = response.headers.get("www-authenticate") ?? undefined;

  if (message) {
    details.push(message);
  }
  if (documentationUrl) {
    details.push(documentationUrl);
  }
  if (authenticateHeader) {
    details.push(`www-authenticate: ${authenticateHeader}`);
  }

  return details.join(" - ");
}

async function _readJsonErrorBody(
  response: FetchResponseLike
): Promise<{ documentation_url?: unknown; message?: unknown } | undefined> {
  const contentType = response.headers.get("content-type")?.split(";")[0];
  if (contentType && contentType !== "application/json" && !contentType.endsWith("+json")) {
    return undefined;
  }

  try {
    const body = await response.json();
    if (body && typeof body === "object") {
      return body as { documentation_url?: unknown; message?: unknown };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function _shouldRetryError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /fetch failed|status 429|status 502|status 503|status 504/.test(error.message);
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
