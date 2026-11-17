/**
 * Google account id and sign-in when Blob storage is missing.
 * Run: npx tsx --tsconfig tsconfig.json scripts/check-google-auth.ts
 */
import assert from "node:assert/strict";

process.env.VERCEL = "1";
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_STORE_ID;
delete process.env.VERCEL_OIDC_TOKEN;

async function main(): Promise<void> {
  const { findOrCreateGoogleUser, googleAccountId, googleSessionUser } =
    await import("../src/lib/server/users");
  const { verifyGoogleIdToken } = await import("../src/lib/server/google-oauth");

  const id = googleAccountId("sub-123");
  assert.equal(id, googleAccountId("sub-123"));
  assert.match(id, /^usr_[0-9a-f]{20}$/);
  assert.notEqual(googleAccountId("sub-123"), googleAccountId("sub-456"));

  const session = googleSessionUser({ sub: "sub-123", name: "Ashford" });
  assert.equal(session.id, id);
  assert.equal(session.username, "Ashford");

  const created = await findOrCreateGoogleUser({
    sub: "sub-123",
    name: "Ashford",
  });
  assert.ok(!("error" in created));
  if (!("error" in created)) {
    assert.equal(created.user.id, id);
    assert.equal(created.user.username, "Ashford");
  }

  await assert.rejects(() => verifyGoogleIdToken("not-a-jwt", "nonce"));
  console.log("check-google-auth ok");
}

void main();
