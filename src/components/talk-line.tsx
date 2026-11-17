"use client";

import Link from "next/link";
import { findDragon } from "@/lib/dragons";
import { troopShort, modeShort } from "@/lib/labels";
import type { TalkLine } from "@/lib/talk-types";

export function TalkLineChip({ line }: { line: TalkLine }) {
  const left = findDragon(line.left)?.name ?? line.left;
  const vanguard = findDragon(line.vanguard)?.name ?? line.vanguard;
  const right = findDragon(line.right)?.name ?? line.right;
  return (
    <p className="text-[13px] text-amber-100/90">
      <span className="text-muted-foreground">
        {troopShort[line.troop]} · {modeShort[line.mode]}
      </span>
      {" · "}
      {left} / {vanguard} / {right}
    </p>
  );
}

export function talkNewHref(boardId?: string | null): string {
  if (!boardId) return "/forums/new";
  return `/forums/new?board=${encodeURIComponent(boardId)}`;
}

export function TalkThreadLink({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={`/forums/${id}`} className="text-amber-200 hover:underline">
      {children}
    </Link>
  );
}
