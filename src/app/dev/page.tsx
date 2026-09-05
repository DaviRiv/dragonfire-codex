import { Suspense } from "react";
import { DevPage } from "./dev-page";

export const metadata = {
  title: "Dev catalog",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Opening the catalog…</p>
      }
    >
      <DevPage />
    </Suspense>
  );
}
