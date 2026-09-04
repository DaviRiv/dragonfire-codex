import type { Metadata } from "next";
import { CoachPage } from "./coach-page";

export const metadata: Metadata = {
  title: "Coach",
  description:
    "Talk to a formation coach about three-dragon lines from your pit or the hatchery.",
};

export default function Page() {
  return <CoachPage />;
}
