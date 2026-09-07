import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

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
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJsonFile(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmp, file);
}

export function mutateJsonFile<T>(
  file: string,
  fallback: T,
  mutate: (current: T) => T | Promise<T>,
): Promise<T> {
  return withLock(file, async () => {
    const current = await readJsonFile(file, fallback);
    const next = await mutate(current);
    await writeJsonFile(file, next);
    return next;
  });
}
