import type { Metadata } from "next";
import { Suspense } from "react";
import { CounterPage } from "../counter-page";

export const metadata: Metadata = {
  title: "Counter",
  description:
    "Seat the three dragons you have to beat, with their stars, then pick a march that holds troop advantage and answers live Recovery.",
};

export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Opening counter…</p>}
    >
      <CounterPage />
    </Suspense>
  );
}
