"use client";

import { FormationBoard } from "@/components/formation-board";
import { Button } from "@/components/ui/button";
import type { AroundChoice } from "@/lib/around-choices";
import { modeShort, troopShort } from "@/lib/labels";
import { usePit } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CheckCircle2, TriangleAlert } from "lucide-react";

export function TeamChoiceCard({
  choice,
  selected,
  onPick,
}: {
  choice: AroundChoice;
  selected?: boolean;
  onPick: () => void;
}) {
  const { state } = usePit();
  const { line, lineup, pairing, label, pros, cons } = choice;

  return (
    <article
      data-team-choice={choice.id}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl bg-card/70 ring-1 ring-foreground/10",
        selected && "ring-2 ring-amber-300",
      )}
    >
      <FormationBoard
        lineup={lineup}
        state={state}
        buffs={pairing.buffs}
        compact
      />
      <div className="flex flex-1 flex-col gap-3 px-3 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] tracking-wide text-amber-100/80 uppercase">
            {troopShort[line.troop]} · {modeShort[line.mode]} · {label}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NoteList title="Pros" empty="No kit payoffs yet." notes={pros} tone="pro" />
          <NoteList title="Cons" empty="No gaps on this line." notes={cons} tone="con" />
        </div>
        <Button className="mt-auto" onClick={onPick}>
          {selected ? "This is your team" : "Use this team"}
        </Button>
      </div>
    </article>
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
  notes: { title: string; detail?: string }[];
  tone: "pro" | "con";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-label",
          tone === "con" ? "text-red-400" : "text-emerald-200",
        )}
      >
        {title}
        {notes.length ? ` · ${notes.length}` : ""}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {notes.length === 0 ? (
          <li className="rounded-xl px-2 py-2 text-[12px] leading-snug text-muted-foreground ring-1 ring-foreground/10">
            {empty}
          </li>
        ) : (
          notes.map((note) => (
            <li
              key={note.title}
              className={cn(
                "rounded-xl px-2 py-2 ring-1",
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
                  {note.title}
                  {note.detail ? (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
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
