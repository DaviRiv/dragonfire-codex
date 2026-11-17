import type { Metadata } from "next";
import { Suspense } from "react";
import { ForumsListPage } from "./forums-list";

export const metadata: Metadata = {
  title: "Forums",
  description:
    "Alliance recruitment, LFA posts, and Game of Thrones: Dragonfire strategy boards.",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening Forums…</p>}>
      <ForumsListPage />
    </Suspense>
  );
}
