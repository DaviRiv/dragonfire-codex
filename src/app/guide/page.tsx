import type { Metadata } from "next";
import { GuidePage } from "./guide-page";

export const metadata: Metadata = {
  title: "Beginner's guide",
  description:
    "What the four dragon stats do, why damage mitigation is worth so much, and what star rank and reign level actually buy you. Written for a brand new Dragonfire player.",
};

export default function Page() {
  return <GuidePage />;
}
