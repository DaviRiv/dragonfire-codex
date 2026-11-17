import path from "node:path";
import { sql, withTransaction, type Sql } from "@/lib/server/db";
import { MAX_JSON_BYTES, StoreFullError } from "@/lib/server/store-limits";

function documentName(file: string): string {
  return path.basename(file);
}

function asValue<T>(body: unknown, fallback: T): T {
  if (body == null) return fallback;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as T;
    } catch {
      return fallback;
    }
  }
  return body as T;
}

export async function readDbJson<T>(file: string, fallback: T): Promise<T> {
  const rows = await sql<{ body: unknown }>(
    "select body from json_documents where name = $1",
    [documentName(file)],
  );
  return asValue(rows[0]?.body, fallback);
}

export async function mutateDbJson<T>(
  file: string,
  fallback: T,
  mutate: (current: T) => T | Promise<T>,
): Promise<T> {
  const name = documentName(file);
  let last: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await withTransaction((query) =>
        writeDocument(query, name, fallback, mutate),
      );
    } catch (error) {
      last = error;
      const code = (error as { code?: string }).code;
      if (code === "23505") continue;
      throw error;
    }
  }
  throw last instanceof Error ? last : new Error("Could not save.");
}

async function writeDocument<T>(
  query: Sql,
  name: string,
  fallback: T,
  mutate: (current: T) => T | Promise<T>,
): Promise<T> {
  const rows = await query<{ body: unknown }>(
    "select body from json_documents where name = $1 for update",
    [name],
  );
  const current = asValue(rows[0]?.body, fallback);
  const next = await mutate(current);
  const payload = JSON.stringify(next);
  if (Buffer.byteLength(payload, "utf8") > MAX_JSON_BYTES) {
    throw new StoreFullError("This board is full. Try again another day.");
  }
  if (rows.length === 0) {
    await query(
      "insert into json_documents (name, body) values ($1, $2::jsonb)",
      [name, payload],
    );
  } else {
    await query(
      "update json_documents set body = $2::jsonb, updated_at = now() where name = $1",
      [name, payload],
    );
  }
  return next;
}
