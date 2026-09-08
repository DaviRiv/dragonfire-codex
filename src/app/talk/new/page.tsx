import type { Metadata } from "next";
import { Suspense } from "react";
import { TalkNewPage } from "./talk-new";

export const metadata: Metadata = {
  title: "New thread",
  description: "Start a Talk thread about a three-dragon line.",
};

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Opening Talk…</p>}
    >
      <TalkNewPage />
    </Suspense>
  );
}
