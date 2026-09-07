import { randomBytes } from "node:crypto";
import {
  normalizeUsername,
  passwordError,
  usernameError,
  usernameKey,
} from "@/lib/account";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { mutateJsonFile, readJsonFile } from "@/lib/server/json-store";
import { usersFile } from "@/lib/server/paths";
import type { SessionUser } from "@/lib/server/session";

export type UserRecord = {
  id: string;
  username: string;
  usernameKey: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
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
  };

  let taken = false;
  await mutateJsonFile(usersFile(), EMPTY, (file) => {
    if (file.users.some((row) => row.usernameKey === key)) {
      taken = true;
      return file;
    }
    return { users: [...file.users, created] };
  });
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
  const ok = await verifyPassword(password, row.passwordSalt, row.passwordHash);
  if (!ok) return { error: "Username or password is wrong." };
  return { user: publicUser(row) };
}
