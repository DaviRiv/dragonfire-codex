"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LineupEditor } from "@/app/lineups/lineup-editor";
import { MiniChip } from "@/components/chip";
import { Button } from "@/components/ui/button";
import {
  readBuildKind,
  readBuildLineupId,
  rememberBuild,
} from "@/lib/build-session";
import { usePit } from "@/lib/store";
import { troopShort } from "@/lib/labels";
import type { LineupKind } from "@/lib/types";
import { Plus } from "lucide-react";

function readKind(): LineupKind {
  return readBuildKind();
}

export function BuildPage() {
  const { ready, state, createLineup, ensureLineup } = usePit();
  const [kind, setKind] = useState<LineupKind>(() => readKind());
  const [activeId, setActiveId] = useState<string | null>(() =>
    readBuildLineupId(),
  );

  useEffect(() => {
    if (!ready) return;
    ensureLineup(kind === "theory" ? "New theory" : "New lineup", kind);
  }, [ready, kind, ensureLineup]);

  function selectLineup(id: string, nextKind = kind) {
    setActiveId(id);
    rememberBuild(nextKind, id);
  }

  function chooseKind(next: LineupKind) {
    setKind(next);
    const lineup = ensureLineup(
      next === "theory" ? "New theory" : "New lineup",
      next,
    );
    selectLineup(lineup.id, next);
  }

  const ofKind = state.lineups.filter((lineup) => lineup.kind === kind);
  const resolvedId =
    (activeId && ofKind.some((lineup) => lineup.id === activeId)
      ? activeId
      : ofKind[0]?.id) ?? null;

  if (!ready || !resolvedId) {
    return <p className="text-sm text-muted-foreground">Opening your team…</p>;
  }

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex items-center gap-1.5">
        <MiniChip active={kind === "pit"} onClick={() => chooseKind("pit")}>
          Pit
        </MiniChip>
        <MiniChip
          active={kind === "theory"}
          onClick={() => chooseKind("theory")}
        >
          Theory
        </MiniChip>
        <Link
          href="/lineups"
          className="ml-auto inline-flex min-h-9 items-center px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Saved
        </Link>
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            const lineup = createLineup(
              kind === "theory"
                ? `Theory ${ofKind.length + 1}`
                : `Lineup ${ofKind.length + 1}`,
              kind,
            );
            setActiveId(lineup.id);
            rememberBuild(kind, lineup.id);
          }}
          aria-label="New team"
        >
          <Plus />
        </Button>
      </div>

      {ofKind.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ofKind.map((lineup) => (
            <MiniChip
              key={lineup.id}
              active={resolvedId === lineup.id}
              onClick={() => selectLineup(lineup.id)}
            >
              {lineup.name}
              <span className="ml-1 opacity-70">{troopShort[lineup.troop]}</span>
            </MiniChip>
          ))}
        </div>
      ) : null}
      <LineupEditor
        lineupId={resolvedId}
        embedded
        onOpenLineup={(id) => selectLineup(id)}
      />
    </div>
  );
}
