/**
 * Security guardrails. Run: npm run check:security
 */
import { nextPath } from "../src/lib/account";
import { createOAuthState, verifyOAuthState } from "../src/lib/server/oauth-state";

const cases: [string, string][] = [
  ["/teams", "/teams"],
  ["//evil.com", "/"],
  ["https://evil.com", "/"],
  ["/\\evil.example", "/"],
  ["/%5Cevil.example", "/"],
  ["javascript:alert(1)", "/"],
  ["/talk", "/talk"],
];

for (const [input, want] of cases) {
  const got = nextPath(input);
  if (got !== want) {
    throw new Error(`nextPath(${JSON.stringify(input)}) = ${got}, want ${want}`);
  }
}

if (!nextPath("/lineups/lin-1").startsWith("/lineups")) {
  throw new Error("nextPath should allow normal in-app paths");
}

const state = createOAuthState("/coach");
if (!verifyOAuthState(state)?.next) {
  throw new Error("OAuth state round-trip failed");
}
if (verifyOAuthState(`${state}x`)) {
  throw new Error("OAuth state should reject tampering");
}

console.log("check-security ok");