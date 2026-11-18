import { Suspense } from "react";
import { PitPage } from "./pit-page";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Opening pit…</p>}>
      <PitPage />
    </Suspense>
  );
}
