import type { Metadata } from "next";
import { ForumsThreadPage } from "./forums-thread";

export const metadata: Metadata = {
  title: "Thread · Forums",
  description: "Forum discussion thread on Dragonfire Pit.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ForumsThreadPage id={id} />;
}
