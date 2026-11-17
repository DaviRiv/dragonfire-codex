import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { secretFile } from "@/lib/server/paths";
import { StoreUnavailableError } from "@/lib/server/store-limits";

let cached: Uint8Array | null = null;

export function authSecret(): Uint8Array {
  if (cached) return cached;
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) {
    cached = new TextEncoder().encode(fromEnv);
    return cached;
  }
  if (process.env.VERCEL === "1") {
    throw new StoreUnavailableError(
      "Set AUTH_SECRET in Vercel (a random string, 32+ characters) and redeploy.",
    );
  }
  const file = secretFile();
  try {
    const hex = readFileSync(file, "utf8").trim();
    if (hex.length >= 32) {
      cached = Buffer.from(hex, "hex");
      return cached;
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
  const bytes = randomBytes(32);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${bytes.toString("hex")}\n`, { mode: 0o600 });
  cached = bytes;
  return cached;
}
