"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

/** Whether the host has OPENAI_API_KEY set server-side. */
export function useOpenAiAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void apiJson<{ available: boolean }>("/api/openai/status")
      .then((data) => {
        if (!cancelled) setAvailable(data.available);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}