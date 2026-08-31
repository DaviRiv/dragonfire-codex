"use client";

import { useEffect, useState } from "react";
import { LineupEditor } from "@/app/lineups/lineup-editor";
import { ChoiceButton } from "@/components/chip";
import { Button } from "@/components/ui/button";
import { usePit } from "@/lib/store";
import { troopShort } from "@/lib/labels";
import type { LineupKind } from "@/lib/types";
import { Plus } from "lucide-react";

const KIND_KEY = "dragonfire-build-kind";

function readKind(): LineupKind {
  if (typeof window === "undefined") return "pit";
  return window.sessionStorage.getItem(KIND_KEY) === "theory"
    ? "theory"
    : "pit";
}

export function BuildPage() {
  const { ready, state, createLineup, ensureLineup } = usePit();
  const [kind, setKind] = useState<LineupKind>(() => readKind());
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    ensureLineup(kind === "theory" ? "New theory" : "New lineup", kind);
  }, [ready, kind, ensureLineup]);

  function chooseKind(next: LineupKind) {
    setKind(next);
    sessionStorage.setItem(KIND_KEY, next);
    const lineup = ensureLineup(
      next === "theory" ? "New theory" : "New lineup",
      next,
    );
    setActiveId(lineup.id);
  }

  const ofKind = state.lineups.filter((lineup) => lineup.kind === kind);
  const resolvedId =
    (activeId && ofKind.some((lineup) => lineup.id === activeId)
      ? activeId
      : ofKind[0]?.id) ?? null;

  if (!ready || !resolvedId) {
    return <p className="text-sm text-muted-foreground">Opening the board…</p>;
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-xl tracking-wide sm:text-3xl">
          Build a line
        </h1>
        <Button
          onClick={() => {
            const lineup = createLineup(
              kind === "theory"
                ? `Theory ${ofKind.length + 1}`
                : `Lineup ${ofKind.length + 1}`,
              kind,
            );
            setActiveId(lineup.id);
          }}
          className="shrink-0"
        >
          <Plus data-icon="inline-start" />
          New
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ChoiceButton
          active={kind === "pit"}
          onClick={() => chooseKind("pit")}
        >
          Your pit
        </ChoiceButton>
        <ChoiceButton
          active={kind === "theory"}
          onClick={() => chooseKind("theory")}
        >
          Theory
        </ChoiceButton>
      </div>

      {ofKind.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {ofKind.map((lineup) => (
            <ChoiceButton
              key={lineup.id}
              active={resolvedId === lineup.id}
              onClick={() => setActiveId(lineup.id)}
              className="w-auto min-w-[7.5rem] px-3"
            >
              {lineup.name}
              <span className="ml-1.5 text-[11px] opacity-70">
                {troopShort[lineup.troop]}
              </span>
            </ChoiceButton>
          ))}
        </div>
      ) : null}
      <LineupEditor lineupId={resolvedId} embedded />
    </div>
  );
}
