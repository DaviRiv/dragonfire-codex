import type { Metadata } from "next";
import { CoachPage } from "./coach-page";

export const metadata: Metadata = {
  title: "Copilot (beta)",
  description:
    "Beta local formation copilot for three-dragon lines from your pit or the hatchery. Copy the same roster into ChatGPT for a longer take.",
};

export default function Page() {
  return <CoachPage />;
}
