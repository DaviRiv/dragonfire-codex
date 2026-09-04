"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUserApiKey } from "@/lib/ai/keys";
import { useOpenAiSession } from "@/lib/ai/session";
import { LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

export function OpenAiLogin() {
  const { session, hint, connect, disconnect } = useOpenAiSession();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [serverKey, setServerKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/openai-login")
      .then((response) => response.json())
      .then((json: { serverKey?: boolean }) => {
        if (!cancelled) setServerKey(Boolean(json.serverKey));
      })
      .catch(() => {
        if (!cancelled) setServerKey(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setKey("");
    setError(null);
    setUnreachable(false);
    setBusy(false);
  }

  function close() {
    setOpen(false);
    resetForm();
  }

  async function submit(forceSave = false) {
    const next = key.trim();
    if (!isUserApiKey(next)) {
      setError("That does not look like an OpenAI secret key (sk-…).");
      return;
    }
    setBusy(true);
    setError(null);
    setUnreachable(false);
    try {
      if (!forceSave) {
        const response = await fetch("/api/ai/openai-login", {
          method: "POST",
          headers: { Authorization: `Bearer ${next}` },
        });
        const json = (await response.json()) as {
          error?: string;
          unreachable?: boolean;
        };
        if (response.status === 401 || response.status === 400) {
          setError(json.error || "OpenAI rejected that key.");
          return;
        }
        if (!response.ok) {
          setUnreachable(true);
          setError(
            json.error ||
              "Could not reach OpenAI. You can still save the key in this browser.",
          );
          return;
        }
      }
      connect(next);
      toast.success("Logged in with OpenAI. Suggest combinations will use this key.");
      close();
    } catch {
      setUnreachable(true);
      setError("Could not reach this app’s login check. Save the key in this browser anyway?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      {session ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] leading-snug text-emerald-200">
            Logged in · {hint}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              disconnect();
              toast("Logged out of OpenAI. Suggest will use the local ranker.");
            }}
          >
            <LogOut data-icon="inline-start" />
            Log out
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <LogIn data-icon="inline-start" />
            Log in with OpenAI
          </Button>
          {serverKey ? (
            <p className="text-[13px] text-muted-foreground">
              Server key is set — Suggest can use it until you log in.
            </p>
          ) : null}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
          else setOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wide">
              Log in with OpenAI
            </DialogTitle>
            <DialogDescription>
              Paste a secret key from{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
              >
                platform.openai.com/api-keys
              </a>
              . This is not a ChatGPT password — OpenAI does not let apps call
              the API with a ChatGPT login. The key stays in this browser and
              is sent only when you suggest combinations.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(false);
            }}
          >
            <Label htmlFor="openai-key">API key</Label>
            <Input
              id="openai-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-…"
              value={key}
              onChange={(event) => {
                setKey(event.target.value);
                setError(null);
                setUnreachable(false);
              }}
            />
            {error ? (
              <p className="text-[13px] leading-snug text-amber-100">{error}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </Button>
              {unreachable ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void submit(true)}
                >
                  Save anyway
                </Button>
              ) : null}
              <Button type="submit" size="sm" disabled={busy || !key.trim()}>
                {busy ? "Checking…" : "Log in"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
