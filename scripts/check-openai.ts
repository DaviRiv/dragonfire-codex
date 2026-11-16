/**
 * Server OpenAI wiring (no live call). Run: npm run check:openai
 */
import { openaiConfigured } from "../src/lib/server/openai";

if (process.env.OPENAI_API_KEY?.startsWith("NEXT_PUBLIC")) {
  throw new Error("OPENAI_API_KEY must not use NEXT_PUBLIC");
}
const configured = openaiConfigured();
console.log(
  configured
    ? "check-openai: OPENAI_API_KEY is set on this host"
    : "check-openai: no key (copy/paste ChatGPT only)",
);