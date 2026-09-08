import type { Metadata } from "next";
import { TalkThreadPage } from "./talk-thread";

export const metadata: Metadata = {
  title: "Thread",
  description: "A Talk thread about a three-dragon line.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TalkThreadPage id={id} />;
}
