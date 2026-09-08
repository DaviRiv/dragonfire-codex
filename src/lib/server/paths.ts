import path from "node:path";

export function dataDir(): string {
  return process.env.DRAGONFIRE_DATA ?? path.join(process.cwd(), "data");
}

export function usersFile(): string {
  return path.join(dataDir(), "users.json");
}

export function boardsFile(): string {
  return path.join(dataDir(), "boards.json");
}

export function talkFile(): string {
  return path.join(dataDir(), "talk.json");
}

export function secretFile(): string {
  return path.join(dataDir(), ".auth-secret");
}
