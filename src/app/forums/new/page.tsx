import type { Metadata } from "next";
import { Suspense } from "react";
import { ForumsNewPage } from "./forums-new";

export const metadata: Metadata = {
  title: "New thread · Forums",
  description: "Post a recruitment thread, LFA listing, or strategy topic.",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening composer…</p>}>
      <ForumsNewPage />
    </Suspense>
  );
}
