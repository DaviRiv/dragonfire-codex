const STORAGE_KEY = "dragonfire-pit.dev";
const EVENT = "dragonfire-pit.dev-change";

export function persistDevMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(STORAGE_KEY, "1");
  else window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function readDevMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

/** Same-tab writes fire EVENT; other tabs arrive as `storage`. */
export function subscribeDevMode(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
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
