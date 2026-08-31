"use client";

import { useState } from "react";
import { AbilityText } from "@/components/ability-text";
import { DragonIcon } from "@/components/dragon-icon";
import { StatGrid } from "@/components/dragon-profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { star6Ability } from "@/lib/habits";
import {
  breedChipClass,
  breedLabels,
  vanguardBenefitLines,
} from "@/lib/labels";
import type { DragonSuggestion } from "@/lib/suggest";
import type { SlotId } from "@/lib/types";
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
  slot,
}: {
  suggestion: DragonSuggestion;
  selected?: boolean;
  onPick: () => void;
  onInspect: () => void;
  onSaveNotes?: (ownedId: string, notes: string) => void;
  kind?: "pit" | "theory";
  ignoreLevel?: boolean;
  rank?: number;
  slot?: SlotId;
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
  const synergy = reasons[0];
  const vanguardBits =
    slot === "vanguard" ? vanguardBenefitLines(dragon) : [];
  const star6 = star6Ability(dragon);

  return (
    <div className={cn("min-w-0", selected && "bg-amber-500/20")}>
      <div className="flex min-w-0 items-stretch">
        <button
          type="button"
          onClick={onPick}
          className="flex min-h-9 w-0 min-w-0 flex-1 items-start gap-1.5 overflow-hidden px-2 py-1 text-left select-none active:bg-amber-500/15"
        >
          {rank != null ? (
            <span className="w-4 shrink-0 pt-0.5 text-center text-[11px] tabular-nums text-muted-foreground">
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
            className="mt-px"
          />
          <div className="w-0 min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="font-heading truncate text-sm tracking-wide">
                {dragon.name}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-px text-[10px] tracking-wide ring-1",
                  breedChipClass[dragon.breed],
                )}
              >
                {breedLabels[dragon.breed]}
              </span>
              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                {selected ? "Slotted" : meta}
              </span>
            </div>
            <p className="compact-line mt-px text-[11px] text-amber-200/90" title={synergy}>
              {synergy}
            </p>
            <p
              className="compact-line mt-px text-[11px] leading-snug text-foreground/85"
              title={dragon.command}
            >
              {dragon.command}
            </p>
            {star6 ? (
              <p
                className="compact-line mt-px text-[11px] leading-snug text-foreground/70"
                title={`(6+ stars) ${star6}`}
              >
                {`(6+ stars) ${star6}`}
              </p>
            ) : null}
          </div>
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
          className="flex w-10 shrink-0 items-start justify-center pt-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn("size-4 transition", open && "rotate-180")}
          />
        </button>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-border/40 px-3 py-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
              WITH THIS TEAM
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-amber-100/90">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          {vanguardBits.length > 0 ? (
            <div>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
                VANGUARD
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-emerald-100/90">
                {vanguardBits.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <StatGrid stats={dragon.stats} compact />
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
              COMMAND
            </p>
            <p className="mt-1 text-sm leading-snug">
              <AbilityText text={dragon.command} />
            </p>
          </div>
          {star6 ? (
            <div>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
                (6+ STARS)
              </p>
              <p className="mt-1 text-sm leading-snug">
                <AbilityText text={star6} />
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
              HABIT
            </p>
            <p className="mt-1 text-sm leading-snug">
              <AbilityText text={dragon.habit} />
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
