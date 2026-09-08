import type { Metadata } from "next";
import { TalkListPage } from "./talk-list";

export const metadata: Metadata = {
  title: "Talk",
  description:
    "Message board for Game of Thrones: Dragonfire three-dragon teams. Read threads, then register to post.",
};

export default function Page() {
  return <TalkListPage />;
}
