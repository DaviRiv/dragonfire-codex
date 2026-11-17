/** Caps for whole-file JSON stores on a public host. */
export const MAX_USERS = 5_000;
export const MAX_TALK_THREADS = 2_000;
export const MAX_BOARDS = 5_000;
export const MAX_JSON_BYTES = 4 * 1024 * 1024;

export class StoreFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreFullError";
  }
}

export class StoreUnavailableError extends Error {
  constructor(
    message = "Accounts cannot be saved on this host yet. In Vercel open Storage, create a Blob store, connect it to this project, and redeploy.",
  ) {
    super(message);
    this.name = "StoreUnavailableError";
  }
}