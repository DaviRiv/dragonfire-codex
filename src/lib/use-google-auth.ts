"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

export function useGoogleAuthAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void apiJson<{ available: boolean }>("/api/auth/google/status")
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