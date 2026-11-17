import { createHash, randomBytes } from "node:crypto";
import {
  USERNAME_MAX,
  USERNAME_MIN,
  normalizeUsername,
  passwordError,
  usernameError,
  usernameKey,
} from "@/lib/account";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { mutateJsonFile, readJsonFile } from "@/lib/server/json-store";
import { usersFile } from "@/lib/server/paths";
import { MAX_USERS, StoreUnavailableError } from "@/lib/server/store-limits";
import type { SessionUser } from "@/lib/server/session";

export type UserRecord = {
  id: string;
  username: string;
  usernameKey: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  /** Present when the account signs in with Google only. */
  oauthProvider?: "google";
  googleSub?: string;
};

type UsersFile = { users: UserRecord[] };

const EMPTY: UsersFile = { users: [] };

function publicUser(row: UserRecord): SessionUser {
  return { id: row.id, username: row.username };
}

export async function listUsers(): Promise<UserRecord[]> {
  const file = await readJsonFile(usersFile(), EMPTY);
  return file.users;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const users = await listUsers();
  return users.find((row) => row.id === id) ?? null;
}

export async function registerUser(
  usernameRaw: string,
  password: string,
): Promise<{ user: SessionUser } | { error: string }> {
  const username = normalizeUsername(usernameRaw);
  const nameErr = usernameError(username);
  if (nameErr) return { error: nameErr };
  const passErr = passwordError(password);
  if (passErr) return { error: passErr };

  const key = usernameKey(username);
  const hashed = await hashPassword(password);
  const created: UserRecord = {
    id: `usr_${randomBytes(9).toString("hex")}`,
    username,
    usernameKey: key,
    passwordSalt: hashed.salt,
    passwordHash: hashed.hash,
    createdAt: new Date().toISOString(),
    oauthProvider: undefined,
  };

  let taken = false;
  let full = false;
  await mutateJsonFile(usersFile(), EMPTY, (file) => {
    if (file.users.length >= MAX_USERS) {
      full = true;
      return file;
    }
    if (file.users.some((row) => row.usernameKey === key)) {
      taken = true;
      return file;
    }
    return { users: [...file.users, created] };
  });
  if (full) return { error: "Registration is closed for now." };
  if (taken) return { error: "That username is already taken." };
  return { user: publicUser(created) };
}

export async function loginUser(
  usernameRaw: string,
  password: string,
): Promise<{ user: SessionUser } | { error: string }> {
  const key = usernameKey(usernameRaw);
  if (!key || !password) {
    return { error: "Username or password is wrong." };
  }
  const users = await listUsers();
  const row = users.find((user) => user.usernameKey === key);
  if (!row) return { error: "Username or password is wrong." };
  if (row.oauthProvider === "google") {
    return { error: "This account uses Google sign-in." };
  }
  const ok = await verifyPassword(password, row.passwordSalt, row.passwordHash);
  if (!ok) return { error: "Username or password is wrong." };
  return { user: publicUser(row) };
}

function baseUsernameFromGoogle(profile: {
  name?: string;
  email?: string;
}): string {
  const fromEmail = profile.email?.split("@")[0] ?? "";
  const raw = (profile.name ?? fromEmail).replace(/[^a-zA-Z0-9_]/g, "");
  let name = raw.slice(0, USERNAME_MAX);
  if (name.length < USERNAME_MIN) {
    name = `player${randomBytes(3).toString("hex")}`;
  }
  if (!/^[a-zA-Z]/.test(name)) name = `p${name}`.slice(0, USERNAME_MAX);
  const err = usernameError(name);
  if (err) name = `player${randomBytes(3).toString("hex")}`;
  return name;
}

function pickGoogleUsername(
  taken: Set<string>,
  profile: { name?: string; email?: string },
): string {
  const base = baseUsernameFromGoogle(profile);
  const key = usernameKey(base);
  if (!taken.has(key)) return base;
  for (let n = 2; n < 1000; n++) {
    const suffix = String(n);
    const trimmed = base.slice(0, USERNAME_MAX - suffix.length) + suffix;
    const candidate = usernameKey(trimmed);
    if (!taken.has(candidate)) return trimmed;
  }
  return `player${randomBytes(4).toString("hex")}`;
}

/** Stable id so a Google account matches after the user store comes online. */
export function googleAccountId(sub: string): string {
  const hex = createHash("sha256").update(`google:${sub}`).digest("hex").slice(0, 20);
  return `usr_${hex}`;
}

export function googleSessionUser(profile: {
  sub: string;
  email?: string;
  name?: string;
}): SessionUser {
  return {
    id: googleAccountId(profile.sub),
    username: baseUsernameFromGoogle(profile),
  };
}

export async function findOrCreateGoogleUser(profile: {
  sub: string;
  email?: string;
  name?: string;
}): Promise<{ user: SessionUser } | { error: string }> {
  if (!profile.sub) return { error: "Google did not return a user id." };
  try {
    return await findOrCreateStoredGoogleUser(profile);
  } catch (error) {
    if (error instanceof StoreUnavailableError) {
      return { user: googleSessionUser(profile) };
    }
    throw error;
  }
}

async function findOrCreateStoredGoogleUser(profile: {
  sub: string;
  email?: string;
  name?: string;
}): Promise<{ user: SessionUser } | { error: string }> {
  const users = await listUsers();
  const existing = users.find((row) => row.googleSub === profile.sub);
  if (existing) return { user: publicUser(existing) };

  const taken = new Set(users.map((row) => row.usernameKey));
  const username = pickGoogleUsername(taken, profile);
  const key = usernameKey(username);
  const noop = await hashPassword(randomBytes(32).toString("hex"));
  const created: UserRecord = {
    id: googleAccountId(profile.sub),
    username,
    usernameKey: key,
    passwordSalt: noop.salt,
    passwordHash: noop.hash,
    createdAt: new Date().toISOString(),
    oauthProvider: "google",
    googleSub: profile.sub,
  };

  let full = false;
  let race = false;
  await mutateJsonFile(usersFile(), EMPTY, (file) => {
    if (file.users.some((row) => row.googleSub === profile.sub)) {
      race = true;
      return file;
    }
    if (file.users.length >= MAX_USERS) {
      full = true;
      return file;
    }
    if (file.users.some((row) => row.usernameKey === key)) {
      race = true;
      return file;
    }
    return { users: [...file.users, created] };
  });
  if (race) {
    const again = (await listUsers()).find((row) => row.googleSub === profile.sub);
    if (again) return { user: publicUser(again) };
    return { error: "Could not create your account. Try again." };
  }
  if (full) return { error: "Registration is closed for now." };
  return { user: publicUser(created) };
}
