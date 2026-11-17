import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { blobEnabled, mutateBlobJson, readBlobJson } from "@/lib/server/blob-store";
import { databaseEnabled } from "@/lib/server/db";
import { mutateDbJson, readDbJson } from "@/lib/server/db-json";
import { MAX_JSON_BYTES, StoreFullError, StoreUnavailableError } from "@/lib/server/store-limits";

const locks = new Map<string, Promise<void>>();

function withLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(file) ?? Promise.resolve();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(
    file,
    previous.then(() => gate, () => gate),
  );
  return previous.then(fn, fn).finally(() => {
    release();
  });
}

export async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  if (databaseEnabled()) return readDbJson(file, fallback);
  if (blobEnabled()) return readBlobJson(file, fallback);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fallback;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      throw new StoreUnavailableError();
    }
    throw error;
  }
}

export async function writeJsonFile(file: string, value: unknown): Promise<void> {
  if (databaseEnabled()) {
    await mutateDbJson(file, value, () => value);
    return;
  }
  if (blobEnabled()) {
    await mutateBlobJson(file, value, () => value);
    return;
  }
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(payload, "utf8") > MAX_JSON_BYTES) {
    throw new StoreFullError("This board is full. Try again another day.");
  }
  try {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, payload, "utf8");
    await rename(tmp, file);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      throw new StoreUnavailableError();
    }
    throw error;
  }
}

export function mutateJsonFile<T>(
  file: string,
  fallback: T,
  mutate: (current: T) => T | Promise<T>,
): Promise<T> {
  return withLock(file, async () => {
    if (databaseEnabled()) return mutateDbJson(file, fallback, mutate);
    if (blobEnabled()) return mutateBlobJson(file, fallback, mutate);
    const current = await readJsonFile(file, fallback);
    const next = await mutate(current);
    await writeJsonFile(file, next);
    return next;
  });
}
