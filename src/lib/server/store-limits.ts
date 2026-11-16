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