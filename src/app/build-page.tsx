"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LineupEditor } from "@/app/lineups/lineup-editor";
import { accountHref } from "@/components/account-gate";
import { MiniChip } from "@/components/chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { preferredSlot } from "@/lib/ai/around";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { boardLineFromLineup, type BoardPublic } from "@/lib/boards";
import {
  readBuildKind,
  readBuildLineupId,
  rememberBuild,
} from "@/lib/build-session";
import { getCatalogDragon } from "@/data/dragons";
import { slotShort, troopShort } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { LineupKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { toast } from "sonner";

function readKind(): LineupKind {
  return readBuildKind();
}

export function BuildPage({
  pin,
  onPublished,
  belowFormation,
}: {
  pin?: { dragonId: string; stars: number } | null;
  onPublished?: (board: BoardPublic) => void;
  belowFormation?: ReactNode;
}) {
  const { user } = useAuth();
  const {
    ready,
    state,
    createLineup,
    ensureLineup,
    slotDragon,
    updateSlotPick,
    updateLineup,
  } = usePit();
  const [kind, setKind] = useState<LineupKind>(() => readKind());
  const [activeId, setActiveId] = useState<string | null>(() =>
    readBuildLineupId(),
  );
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!ready) return;
    ensureLineup(kind === "theory" ? "New theory" : "New lineup", kind);
  }, [ready, kind, ensureLineup]);

  useEffect(() => {
    if (!ready) return;
    if (state.owned.length === 0 && kind === "pit") {
      const lineup = ensureLineup("New theory", "theory");
      setKind("theory");
      setActiveId(lineup.id);
      rememberBuild("theory", lineup.id);
    }
  }, [ready, state.owned.length, kind, ensureLineup]);

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
  const lineup = state.lineups.find((row) => row.id === resolvedId) ?? null;
  const pinDragon = pin ? getCatalogDragon(pin.dragonId) : null;
  const pinSlot = pinDragon ? preferredSlot(pinDragon) : null;
  const pinOwned = pin
    ? state.owned.some((row) => row.dragonId === pin.dragonId)
    : false;

  function putPinOnTeam() {
    if (!pin || !pinDragon || !pinSlot || !resolvedId) return;
    if (kind === "pit" && !pinOwned) {
      toast.error(
        `${pinDragon.name} is not marked owned. Switch to Theory, or mark them in Hatchery.`,
      );
      return;
    }
    if (kind === "theory") {
      updateLineup(resolvedId, { craftStars: pin.stars });
    }
    slotDragon(resolvedId, pinSlot, pin.dragonId);
    updateSlotPick(resolvedId, pinSlot, { starRank: pin.stars });
    toast.success(`${pinDragon.name} on ${slotShort[pinSlot]} at ★${pin.stars}.`);
  }

  async function shareLine() {
    if (!lineup) return;
    const line = boardLineFromLineup(lineup);
    if (!line) {
      toast.error("Fill left, vanguard, and right before posting.");
      return;
    }
    if (!user) {
      toast.error("Register an account to post a line for review.");
      return;
    }
    setSharing(true);
    try {
      const data = await apiJson<{ board: BoardPublic }>("/api/boards", {
        method: "POST",
        body: JSON.stringify(line),
      });
      toast.success("Posted for community review.");
      onPublished?.(data.board);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not post that line.",
      );
    } finally {
      setSharing(false);
    }
  }

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
            const next = createLineup(
              kind === "theory"
                ? `Theory ${ofKind.length + 1}`
                : `Lineup ${ofKind.length + 1}`,
              kind,
            );
            setActiveId(next.id);
            rememberBuild(kind, next.id);
          }}
          aria-label="New team"
        >
          <Plus />
        </Button>
      </div>

      {ofKind.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ofKind.map((row) => (
            <MiniChip
              key={row.id}
              active={resolvedId === row.id}
              onClick={() => selectLineup(row.id)}
            >
              {row.name}
              <span className="ml-1 opacity-70">{troopShort[row.troop]}</span>
            </MiniChip>
          ))}
        </div>
      ) : null}

      {pinDragon && pinSlot ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={putPinOnTeam}>
            Put {pinDragon.name} on {slotShort[pinSlot]}
          </Button>
          {user ? (
            <Button
              size="sm"
              variant="outline"
              disabled={sharing}
              onClick={() => void shareLine()}
            >
              {sharing ? "Posting…" : "Post this line for review"}
            </Button>
          ) : (
            <Link
              href={accountHref("/team")}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Sign in to post a review line
            </Link>
          )}
        </div>
      ) : user ? (
        <Button
          size="sm"
          variant="outline"
          disabled={sharing}
          onClick={() => void shareLine()}
        >
          {sharing ? "Posting…" : "Post this line for review"}
        </Button>
      ) : (
        <Link
          href={accountHref("/team")}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Sign in to post a review line
        </Link>
      )}

      <LineupEditor
        lineupId={resolvedId}
        embedded
        onOpenLineup={(id) => selectLineup(id)}
        belowFormation={belowFormation}
      />
    </div>
  );
}
