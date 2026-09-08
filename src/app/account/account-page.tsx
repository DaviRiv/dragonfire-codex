"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MiniChip } from "@/components/chip";
import { nextPath, passwordError, usernameError } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function AccountPage() {
  const { ready, user, register, login, logout } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const next = nextPath(search.get("next"));
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const nameErr = mode === "register" ? usernameError(username) : null;
    const passErr = mode === "register" ? passwordError(password) : null;
    if (nameErr) {
      toast.error(nameErr);
      return;
    }
    if (passErr) {
      toast.error(passErr);
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") await register(username, password);
      else await login(username, password);
      toast.success(
        mode === "register"
          ? "Account ready. Copilot is unlocked."
          : "Signed in. Copilot is unlocked.",
      );
      router.push(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Opening account…</p>;
  }

  if (user) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div>
          <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
            Account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="text-amber-100">{user.username}</span>.
            Copilot and team-line reviews use this name.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push("/team")}>Open Team</Button>
          <Button variant="outline" onClick={() => router.push("/coach")}>
            Open Copilot
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void logout().then(() => toast.success("Signed out."));
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="font-heading text-2xl tracking-wide sm:text-3xl">
          Account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Register to unlock Copilot and to rate or post three-dragon lines on
          Team. Passwords stay on this server; there is no email login.
        </p>
      </div>
      <div className="flex gap-1">
        <MiniChip
          active={mode === "register"}
          onClick={() => setMode("register")}
        >
          Register
        </MiniChip>
        <MiniChip active={mode === "signin"} onClick={() => setMode("signin")}>
          Sign in
        </MiniChip>
      </div>
      <form
        className="space-y-3 rounded-2xl bg-card/70 p-4 ring-1 ring-foreground/10"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="e.g. ashford"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8+ characters"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "register" ? "Create account" : "Sign in"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        After you register, Copilot on{" "}
        <Link href="/coach" className="text-amber-200 hover:underline">
          /coach
        </Link>{" "}
        opens, and you can rate or post lines on{" "}
        <Link href="/team" className="text-amber-200 hover:underline">
          Team
        </Link>
        .
      </p>
    </div>
  );
}
