const STORAGE_KEY = "dragonfire-pit.dev";

export function persistDevMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(STORAGE_KEY, "1");
  else window.localStorage.removeItem(STORAGE_KEY);
}

export function readDevMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function applyDevQuery(value: string | null): boolean | null {
  if (value === "1") {
    persistDevMode(true);
    return true;
  }
  if (value === "0") {
    persistDevMode(false);
    return false;
  }
  return null;
}
