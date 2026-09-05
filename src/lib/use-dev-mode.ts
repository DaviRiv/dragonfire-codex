"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { applyDevQuery, readDevMode } from "@/lib/dev-mode";

/** `null` until this browser’s flag is read. */
export function useDevMode(): boolean | null {
  const params = useSearchParams();
  const query = params.get("dev");
  const [on, setOn] = useState<boolean | null>(() =>
    query === "1" ? true : query === "0" ? false : null,
  );

  useEffect(() => {
    const fromQuery = applyDevQuery(params.get("dev"));
    setOn(fromQuery ?? readDevMode());
  }, [params]);

  return on;
}
