import type { Metadata } from "next";
import { BoardsPage } from "./boards-page";

export const metadata: Metadata = {
  title: "Boards",
  description:
    "Pick a dragon and star rank, then rate Copilot’s three-dragon lines and leave notes.",
};

export default function Home() {
  return <BoardsPage />;
}
