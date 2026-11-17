import path from "node:path";
import { BlobPreconditionFailedError, BlobError, get, put } from "@vercel/blob";
import { MAX_JSON_BYTES, StoreFullError, StoreUnavailableError } from "@/lib/server/store-limits";

const PREFIX = "dragonfire/";

function blobCredentials(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  return Boolean(
    process.env.VERCEL_OIDC_TOKEN?.trim() && process.env.BLOB_STORE_ID?.trim(),
  );
}

/** Use Blob only when this deployment actually has a store connected. */
export function blobEnabled(): boolean {
  return process.env.VERCEL === "1" && blobCredentials();
}

function blobPath(file: string): string {
  return `${PREFIX}${path.basename(file)}`;
}

function toStoreError(error: unknown): Error {
  if (error instanceof StoreFullError || error instanceof StoreUnavailableError) {
    return error;
  }
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
    return new StoreUnavailableError();
  }
  if (error instanceof BlobError) {
    if (!error.message.includes("No blob credentials") && !error.message.includes("No read-write token")) {
      console.error(error);
    }
    return new StoreUnavailableError();
  }
  return error instanceof Error ? error : new StoreUnavailableError();
}

async function readBlobState<T>(
  file: string,
  fallback: T,
): Promise<{ value: T; etag?: string }> {
  let result: Awaited<ReturnType<typeof get>>;
  try {
    result = await get(blobPath(file), { access: "private", useCache: false });
  } catch (error) {
    throw toStoreError(error);
  }
  if (!result || result.statusCode !== 200 || !result.stream) {
    return { value: fallback };
  }
  const text = await new Response(result.stream).text();
  try {
    return { value: JSON.parse(text) as T, etag: result.blob.etag };
  } catch {
    return { value: fallback, etag: result.blob.etag };
  }
}

export async function readBlobJson<T>(file: string, fallback: T): Promise<T> {
  const state = await readBlobState(file, fallback);
  return state.value;
}

export async function mutateBlobJson<T>(
  file: string,
  fallback: T,
  mutate: (current: T) => T | Promise<T>,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    const state = await readBlobState(file, fallback);
    const next = await mutate(state.value);
    const payload = `${JSON.stringify(next, null, 2)}\n`;
    if (Buffer.byteLength(payload, "utf8") > MAX_JSON_BYTES) {
      throw new StoreFullError("This board is full. Try again another day.");
    }
    try {
      await put(blobPath(file), payload, {
        access: "private",
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        ...(state.etag ? { ifMatch: state.etag } : {}),
      });
      return next;
    } catch (error) {
      last = error;
      if (error instanceof BlobPreconditionFailedError) continue;
      throw toStoreError(error);
    }
  }
  throw toStoreError(last);
}
