"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isUserApiKey, maskOpenAiKey } from "@/lib/ai/keys";

const STORAGE_KEY = "dragonfire-openai.v1";
const EVENT = "dragonfire-openai";

export type OpenAiSession = {
  apiKey: string;
};

function read(): OpenAiSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { apiKey?: unknown };
    if (typeof parsed.apiKey !== "string" || !isUserApiKey(parsed.apiKey)) {
      return null;
    }
    return { apiKey: parsed.apiKey.trim() };
  } catch {
    return null;
  }
}

let cached: OpenAiSession | null | undefined;

function snapshot(): OpenAiSession | null {
  if (cached === undefined) cached = read();
  return cached;
}

function subscribe(onStoreChange: () => void) {
  const refresh = () => {
    cached = undefined;
    onStoreChange();
  };
  window.addEventListener(EVENT, refresh);
  window.addEventListener("storage", refresh);
  return () => {
    window.removeEventListener(EVENT, refresh);
    window.removeEventListener("storage", refresh);
  };
}

export function writeOpenAiSession(apiKey: string) {
  const key = apiKey.trim();
  if (!isUserApiKey(key)) {
    throw new Error("That does not look like an OpenAI API key.");
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey: key }));
  cached = { apiKey: key };
  window.dispatchEvent(new Event(EVENT));
}

export function clearOpenAiSession() {
  window.localStorage.removeItem(STORAGE_KEY);
  cached = null;
  window.dispatchEvent(new Event(EVENT));
}

export function useOpenAiSession() {
  const session = useSyncExternalStore(subscribe, snapshot, () => null);
  const connect = useCallback((apiKey: string) => {
    writeOpenAiSession(apiKey);
  }, []);
  const disconnect = useCallback(() => {
    clearOpenAiSession();
  }, []);
  return {
    session,
    hint: session ? maskOpenAiKey(session.apiKey) : null,
    connect,
    disconnect,
  };
}
