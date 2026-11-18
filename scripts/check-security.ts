/**
 * Security guardrails. Run: npm run check:security
 */
import { nextPath } from "../src/lib/account";
import { openAiPromptError, MAX_OPENAI_PROMPT } from "../src/lib/server/openai-prompt";
import { clientAddress } from "../src/lib/server/rate-limit";
import { createOAuthState, verifyOAuthState } from "../src/lib/server/oauth-state";
import {
  sanitizeBoardId,
  sanitizeTalkLine,
} from "../src/lib/server/talk-validate";

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

if (!("error" in sanitizeTalkLine({
  name: "Test",
  troop: "not-a-troop",
  mode: "pvp",
  left: "vhagar",
  vanguard: "malachite",
  right: "venator",
}))) {
  throw new Error("sanitizeTalkLine should reject invalid troop");
}
if (!("error" in sanitizeBoardId("not-a-board"))) {
  throw new Error("sanitizeBoardId should reject bad id");
}
if (openAiPromptError("tell me a joke")) {
  // expected
} else {
  throw new Error("openAiPromptError should reject generic prompts");
}
const okPrompt = `You are coaching a Game of Thrones: Dragonfire player in ChatGPT.

Game facts:
- test

--- Roster ---
roster`;
if (openAiPromptError(okPrompt)) {
  throw new Error(`export-shaped prompt should pass: ${openAiPromptError(okPrompt)}`);
}
if (openAiPromptError("x".repeat(MAX_OPENAI_PROMPT + 1))) {
  // expected
} else {
  throw new Error("openAiPromptError should reject overlong prompts");
}

const spoofed = new Request("http://localhost", {
  headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.9.9.9" },
});
if (clientAddress(spoofed) !== "9.9.9.9") {
  throw new Error(
    `clientAddress should use last XFF hop, got ${clientAddress(spoofed)}`,
  );
}

console.log("check-security ok");