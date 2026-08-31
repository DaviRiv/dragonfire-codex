"use client";

import { useState } from "react";
import { AbilityText } from "@/components/ability-text";
import { DragonIcon } from "@/components/dragon-icon";
import { StatGrid } from "@/components/dragon-profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DragonSuggestion } from "@/lib/suggest";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

export function SuggestTile({
  suggestion,
  selected,
  onPick,
  onInspect,
  onSaveNotes,
  kind,
  ignoreLevel,
  rank,
}: {
  suggestion: DragonSuggestion;
  selected?: boolean;
  onPick: () => void;
  onInspect: () => void;
  onSaveNotes?: (ownedId: string, notes: string) => void;
  kind?: "pit" | "theory";
  ignoreLevel?: boolean;
  rank?: number;
}) {
  const { dragon, owned, reasons, starRank, reignLevel } = suggestion;
  const notesId = owned?.id ?? dragon.id;
  const storedNotes = owned?.notes ?? "";
  const [draft, setDraft] = useState({ id: notesId, notes: storedNotes });
  if (draft.id !== notesId) {
    setDraft({ id: notesId, notes: storedNotes });
  }
  const notes = draft.notes;
  const [open, setOpen] = useState(false);

  const meta =
    kind === "theory"
      ? owned
        ? `Aim ★${starRank} · own ★${owned.starRank}`
        : `Aim ★${starRank}`
      : ignoreLevel
        ? `★${starRank}`
        : `★${starRank} · R${reignLevel}`;

  const notesDirty = owned ? notes !== storedNotes : false;

  return (
    <div className={cn(selected && "bg-amber-500/20")}>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onPick}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left select-none active:bg-amber-500/15"
        >
          {rank != null ? (
            <span className="w-4 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
              {rank}
            </span>
          ) : null}
          <DragonIcon
            dragonId={dragon.id}
            name={dragon.name}
            rarity={dragon.rarity}
            custom={dragon.custom}
            selected={selected}
            size="sm"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="font-heading truncate text-sm tracking-wide">
                {dragon.name}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {selected ? "Slotted" : meta}
              </span>
            </span>
            <span className="block truncate text-[11px] text-amber-200/90">
              {reasons[0]}
              {owned?.notes ? " · notes" : ""}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={
            open
              ? `Hide details for ${dragon.name}`
              : `Show details for ${dragon.name}`
          }
          className="flex w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn("size-4 transition", open && "rotate-180")}
          />
        </button>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-border/40 px-3 py-3">
          <StatGrid stats={dragon.stats} compact />
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
              HABIT
            </p>
            <p className="mt-1 text-sm leading-snug">
              <AbilityText text={dragon.habit} />
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
              COMMAND
            </p>
            <p className="mt-1 text-sm leading-snug">
              <AbilityText text={dragon.command} />
            </p>
          </div>
          {owned && onSaveNotes ? (
            <div className="space-y-1.5">
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
                YOUR NOTES
              </p>
              <Textarea
                value={notes}
                onChange={(e) =>
                  setDraft({ id: notesId, notes: e.target.value })
                }
                placeholder="Relics, rider, who it pairs with…"
                className="min-h-20 text-sm"
              />
              <Button
                size="sm"
                disabled={!notesDirty}
                onClick={() => {
                  onSaveNotes(owned.id, notes);
                  toast.success(`Notes saved for ${dragon.name}.`);
                }}
              >
                Save notes
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add this dragon to your pit to keep personal notes.
            </p>
          )}
          <Button variant="outline" size="sm" onClick={onInspect}>
            Full stats
          </Button>
        </div>
      ) : null}
    </div>
  );
}
