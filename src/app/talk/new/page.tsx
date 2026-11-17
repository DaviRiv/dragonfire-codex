import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const board = typeof sp.board === "string" ? sp.board : "";
  redirect(board ? `/forums/new?board=${encodeURIComponent(board)}` : "/forums/new");
}
