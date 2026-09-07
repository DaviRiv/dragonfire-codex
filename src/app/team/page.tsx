import type { Metadata } from "next";
import { BuildPage } from "../build-page";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Build a three-dragon line from your pit or the hatchery, then save it.",
};

export default function Page() {
  return <BuildPage />;
}
