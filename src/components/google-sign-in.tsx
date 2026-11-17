"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";

type GoogleId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    nonce: string;
    ux_mode?: "popup";
    auto_select?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard";
      theme?: "outline" | "filled_black";
      size?: "large";
      text?: "continue_with" | "signin_with";
      shape?: "rectangular";
      width?: number;
      logo_alignment?: "left";
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("load")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
}: {
  onSuccess: (user: AuthUser) => void;
  onError: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let cancelled = false;
    async function start() {
      const setup = await apiJson<{ nonce: string; clientId: string }>(
        "/api/auth/google/nonce",
      );
      if (cancelled || !host.current) return;
      await loadGoogleScript();
      if (cancelled || !host.current || !window.google?.accounts?.id) return;
      const google = window.google.accounts.id;
      google.initialize({
        client_id: setup.clientId,
        nonce: setup.nonce,
        ux_mode: "popup",
        auto_select: false,
        callback: (response) => {
          const credential = response.credential?.trim() ?? "";
          if (!credential) {
            onErrorRef.current("Google sign-in was canceled.");
            return;
          }
          void apiJson<{ user: AuthUser }>("/api/auth/google/credential", {
            method: "POST",
            body: JSON.stringify({ credential }),
          })
            .then((data) => onSuccessRef.current(data.user))
            .catch((error: unknown) => {
              onErrorRef.current(
                error instanceof Error
                  ? error.message
                  : "Google sign-in failed.",
              );
            });
        },
      });
      host.current.replaceChildren();
      google.renderButton(host.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: Math.min(360, host.current.clientWidth || 360),
        logo_alignment: "left",
      });
      if (!cancelled) setReady(true);
    }
    void start().catch(() => {
      if (!cancelled) {
        onErrorRef.current(
          "Google sign-in could not load. Allow accounts.google.com and try again.",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={host}
        className={ready ? "flex min-h-11 w-full items-center justify-center" : "hidden"}
        aria-label="Continue with Google"
      />
      {ready ? null : (
        <Button type="button" variant="outline" className="w-full" disabled>
          Continue with Google
        </Button>
      )}
    </div>
  );
}
