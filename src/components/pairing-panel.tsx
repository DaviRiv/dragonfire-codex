import type { PairingNote, PairingReport, WarnCause } from "@/lib/pairing";
import { StarRequirement } from "@/components/star-requirement";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, TriangleAlert } from "lucide-react";

const CAUSE_LABEL: Record<WarnCause, string> = {
  stars: "Stars",
  teammate: "This line",
  "other-line": "Other team",
  flank: "Flank",
  troop: "Troop",
};

export function PairingPanel({ report }: { report: PairingReport }) {
  const { pros, cons, placedCount } = report;
  const empty = placedCount === 0;
  const quiet = !empty && pros.length === 0 && cons.length === 0;
  const extra =
    !empty && !quiet && cons.length + pros.length > 1
      ? ` +${cons.length + pros.length - 1} more`
      : "";
  const headline = empty
    ? "Slot dragons to see who they need."
    : quiet
      ? "No named partners on this line."
      : (cons[0]?.title ?? pros[0]?.title ?? "");

  return (
    <details className="group rounded-2xl bg-card/70 ring-1 ring-foreground/10">
      <summary className="flex min-h-12 cursor-pointer list-none items-start gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-heading text-[15px] tracking-wide sm:text-base">
              Watch out
            </p>
            {empty || quiet ? null : (
              <p className="shrink-0 text-xs text-muted-foreground">
                {cons.length} idle · {pros.length} live
              </p>
            )}
          </div>
          <p
            className={cn(
              "mt-0.5 text-[13px] leading-snug",
              cons.length
                ? "text-amber-100"
                : quiet || empty
                  ? "text-muted-foreground"
                  : "text-emerald-100",
            )}
          >
            {headline}
            {extra ? (
              <span className="text-muted-foreground">{extra}</span>
            ) : null}
          </p>
        </div>
        <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/50 p-3">
        {empty ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Each warning names a cause: stars too low, the partner is not in
            this three, they are on another saved team, an empty flank, or the
            wrong troop.
          </p>
        ) : quiet ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Named pairings on this line are live. Flanks and troop still sit
            under Why this team.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <NoteColumn
              title="Idle kit"
              empty="Nothing sitting idle."
              notes={cons}
              tone="con"
            />
            <NoteColumn
              title="Live"
              empty="No pairing payoffs yet."
              notes={pros}
              tone="pro"
            />
          </div>
        )}
      </div>
    </details>
  );
}

function NoteColumn({
  title,
  empty,
  notes,
  tone,
}: {
  title: string;
  empty: string;
  notes: PairingNote[];
  tone: "pro" | "con";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-label",
          tone === "con" ? "text-amber-200" : "text-emerald-200",
        )}
      >
        {title}
        {notes.length ? ` · ${notes.length}` : ""}
      </p>
      <ul className="mt-1.5 max-h-[min(18rem,40vh)] space-y-1.5 overflow-y-auto">
        {notes.length === 0 ? (
          <li className="rounded-xl px-2.5 py-2 text-[13px] text-muted-foreground ring-1 ring-foreground/10">
            {empty}
          </li>
        ) : (
          notes.map((note) => (
            <li
              key={note.id}
              className={cn(
                "rounded-xl px-2.5 py-2 ring-1",
                tone === "con"
                  ? "bg-amber-500/10 ring-amber-500/30"
                  : "bg-emerald-500/10 ring-emerald-500/30",
              )}
            >
              <p className="flex gap-1.5 text-[13px] leading-snug text-foreground">
                {tone === "con" ? (
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
                )}
                <span className="min-w-0 font-medium">{note.title}</span>
              </p>
              {note.cause ? (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 pl-5">
                  <span className="rounded-full px-1.5 py-px text-[11px] tracking-wide text-amber-100 ring-1 ring-amber-400/35">
                    {CAUSE_LABEL[note.cause]}
                  </span>
                  {note.cause === "stars" && note.stars != null ? (
                    <StarRequirement
                      stars={note.stars}
                      ownedStars={note.ownedStars}
                    />
                  ) : null}
                </p>
              ) : null}
              <p className="mt-1 pl-5 text-[13px] leading-relaxed text-foreground/80">
                {note.detail}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
