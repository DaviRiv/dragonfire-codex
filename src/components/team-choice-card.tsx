"use client";

import { DragonIcon } from "@/components/dragon-icon";
import { TroopIcon } from "@/components/troop-icon";
import { Button } from "@/components/ui/button";
import { getCatalogDragon } from "@/data/dragons";
import type { AroundChoice, ChoiceNote } from "@/lib/around-choices";
import { troopLabels } from "@/lib/labels";
import { SLOT_IDS } from "@/lib/lineup";
import { cn } from "@/lib/utils";
import { CheckCircle2, TriangleAlert } from "lucide-react";

export function TeamLineList({
  choices,
  pinnedId,
  pinnedIds,
  ownedIds,
  activeId,
  seated,
  onHighlight,
  label = "Teams around this dragon",
}: {
  choices: AroundChoice[];
  pinnedId?: string | null;
  pinnedIds?: Set<string>;
  ownedIds?: Set<string>;
  activeId: string | null;
  seated?: boolean;
  onHighlight: (id: string) => void;
  label?: string;
}) {
  return (
    <ul
      data-team-list
      role="listbox"
      aria-label={label}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      {choices.map((choice) => {
        const active = choice.id === activeId;
        return (
          <li key={choice.id}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              data-team-choice={choice.id}
              onMouseEnter={() => onHighlight(choice.id)}
              onFocus={() => onHighlight(choice.id)}
              onClick={() => onHighlight(choice.id)}
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 text-left transition",
                active
                  ? "bg-amber-500/15 ring-1 ring-inset ring-amber-300"
                  : "hover:bg-muted/60",
              )}
            >
              <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
                {SLOT_IDS.map((slot) => {
                  const dragonId = choice.line[slot];
                  const dragon = getCatalogDragon(dragonId);
                  const pinned = Boolean(
                    pinnedIds?.has(dragonId) ||
                      (pinnedId && dragonId === pinnedId),
                  );
                  const owned = Boolean(ownedIds?.has(dragonId));
                  const seatStars =
                    slot === "left"
                      ? choice.line.leftStars
                      : slot === "vanguard"
                        ? choice.line.vanguardStars
                        : choice.line.rightStars;
                  const showStars = pinned || owned;
                  return (
                    <span key={slot} className="flex min-w-0 items-center gap-1">
                      <DragonIcon
                        dragonId={dragonId}
                        name={dragon?.name}
                        rarity={dragon?.rarity}
                        size="xs"
                        selected={pinned || owned}
                      />
                      <span
                        className={cn(
                          "min-w-0 truncate text-[12px] leading-tight sm:text-[13px]",
                          (pinned || owned) && "text-amber-100",
                        )}
                      >
                        {dragon?.name ?? dragonId}
                        {showStars ? (
                          <span className="text-muted-foreground">
                            {" "}
                            ★{seatStars}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  );
                })}
              </div>
              <span className="flex w-10 shrink-0 flex-col items-end gap-0.5 text-amber-100/80">
                <span title={troopLabels[choice.line.troop]}>
                  <TroopIcon troop={choice.line.troop} className="size-4" />
                </span>
                {seated && active ? (
                  <span className="text-[10px] font-normal text-emerald-200">
                    Seated
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TeamNotesPanel({
  choice,
  seated,
  tweakHref,
  onUse,
  hint,
}: {
  choice: AroundChoice | null;
  seated?: boolean;
  tweakHref?: string | null;
  onUse: () => void;
  hint?: string;
}) {
  if (!choice) {
    return (
      <aside
        data-team-notes
        className="flex h-full min-h-0 flex-col rounded-xl bg-card/70 p-2.5 ring-1 ring-foreground/10"
      >
        <p className="text-sm text-muted-foreground">
          Highlight a line to read kit payoffs and gaps.
        </p>
      </aside>
    );
  }

  return (
    <aside
      data-team-notes
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-card/70 ring-1 ring-foreground/10"
    >
      <div className="shrink-0 border-b border-foreground/10 px-2.5 py-1.5">
        <p className="font-heading truncate text-sm tracking-wide text-amber-50">
          {choice.line.name}
        </p>
        <p className="flex items-center gap-1.5 text-[11px] tracking-wide text-amber-100/80">
          <TroopIcon troop={choice.line.troop} className="size-3.5" />
          <span>{choice.label}</span>
        </p>
        {hint ? (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto overscroll-contain px-2.5 py-2">
        <NoteList
          title="Pros"
          empty="No kit payoffs yet."
          notes={choice.pros}
          tone="pro"
        />
        <NoteList
          title="Cons"
          empty="No gaps on this line."
          notes={choice.cons}
          tone="con"
        />
      </div>
      <div className="shrink-0 space-y-1.5 border-t border-foreground/10 p-2.5">
        <Button className="w-full" onClick={onUse}>
          {seated ? "This is your team" : "Use this team"}
        </Button>
        {tweakHref ? (
          <a
            href={tweakHref}
            className="block text-center text-sm text-amber-200 hover:underline"
          >
            Tweak seats
          </a>
        ) : null}
      </div>
    </aside>
  );
}

function NoteList({
  title,
  empty,
  notes,
  tone,
}: {
  title: string;
  empty: string;
  notes: ChoiceNote[];
  tone: "pro" | "con";
}) {
  return (
    <div className="min-h-0 min-w-0">
      <p
        className={cn(
          "text-label",
          tone === "con" ? "text-red-400" : "text-emerald-200",
        )}
      >
        {title}
        {notes.length ? ` · ${notes.length}` : ""}
      </p>
      <ul className="mt-1 space-y-1">
        {notes.length === 0 ? (
          <li className="rounded-lg px-2 py-1.5 text-[12px] leading-snug text-muted-foreground ring-1 ring-foreground/10">
            {empty}
          </li>
        ) : (
          notes.map((note) => (
            <li
              key={note.title}
              className={cn(
                "rounded-lg px-2 py-1 ring-1",
                tone === "con"
                  ? "bg-[#3a1210] text-red-50 ring-[#c34a2c]/70"
                  : "bg-emerald-500/10 ring-emerald-500/30",
              )}
            >
              <p className="flex gap-1.5 text-[12px] leading-snug">
                {tone === "con" ? (
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-[#e05a3a]" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
                )}
                <span className="min-w-0">
                  <span className="line-clamp-2">{note.title}</span>
                  {note.detail ? (
                    <span className="mt-0.5 block line-clamp-2 text-[11px] text-muted-foreground">
                      {note.detail}
                    </span>
                  ) : null}
                </span>
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
