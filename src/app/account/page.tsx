import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountPage } from "./account-page";

export const metadata: Metadata = {
  title: "Account",
  description:
    "Register or sign in to unlock Copilot and to rate three-dragon lines on Boards.",
};

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Opening account…</p>}
    >
      <AccountPage />
    </Suspense>
  );
}
