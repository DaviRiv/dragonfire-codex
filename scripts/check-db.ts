/**
 * Account documents in Postgres (PGlite when DATABASE_URL is unset).
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-db.ts
 */
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;

async function main(): Promise<void> {
  const { mutateDbJson, readDbJson } = await import("../src/lib/server/db-json");
  const file = "users.json";
  const first = await mutateDbJson(file, { users: [] as { id: string }[] }, (current) => ({
    users: [...current.users, { id: "usr_1" }],
  }));
  assert.equal(first.users.length, 1);
  const again = await mutateDbJson(file, { users: [] as { id: string }[] }, (current) => ({
    users: [...current.users, { id: "usr_2" }],
  }));
  assert.deepEqual(
    again.users.map((user) => user.id),
    ["usr_1", "usr_2"],
  );
  const read = await readDbJson(file, { users: [] as { id: string }[] });
  assert.equal(read.users.length, 2);
  console.log("check-db ok");
}

void main();
