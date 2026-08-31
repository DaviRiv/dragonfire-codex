import type { PairingNote, PairingReport } from "@/lib/pairing";
import { cn } from "@/lib/utils";
import { CheckCircle2, TriangleAlert } from "lucide-react";

export function PairingPanel({ report }: { report: PairingReport }) {
  const { pros, cons, placedCount } = report;
  const empty = placedCount === 0;
  const quiet = !empty && pros.length === 0 && cons.length === 0;

  return (
    <aside className="rounded-2xl bg-card/70 p-3 ring-1 ring-foreground/10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-heading text-[10px] tracking-[0.2em] text-muted-foreground">
            PAIRING
          </p>
          <p className="font-heading mt-0.5 text-base tracking-wide sm:text-lg">
            Pros and cons
          </p>
        </div>
        {empty || quiet ? null : (
          <p className="shrink-0 text-xs text-muted-foreground">
            {cons.length} miss{cons.length === 1 ? "" : "es"} · {pros.length}{" "}
            payoff{pros.length === 1 ? "" : "s"}
          </p>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Named partners and Hub needs — what this line pays off, and what sits
        idle without the right dragon.
      </p>
      {empty ? (
        <p className="mt-3 rounded-xl border border-dashed border-border/80 px-3 py-3 text-sm text-muted-foreground">
          Slot dragons to see pairing payoffs. Moondancer wants a Sentinel.
          Caraxes wants First-Strike.
        </p>
      ) : quiet ? (
        <p className="mt-3 rounded-xl border border-dashed border-border/80 px-3 py-3 text-sm text-muted-foreground">
          No named partner requirements on this line. Flanks and troop affinity
          still live under Why this team.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <NoteColumn
            title="Cons"
            empty="Nothing sitting idle."
            notes={cons}
            tone="con"
          />
          <NoteColumn
            title="Pros"
            empty="No pairing payoffs yet."
            notes={pros}
            tone="pro"
          />
        </div>
      )}
    </aside>
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
          "font-heading text-[10px] tracking-[0.18em]",
          tone === "con" ? "text-amber-200/90" : "text-emerald-200/90",
        )}
      >
        {title.toUpperCase()}
        {notes.length ? ` · ${notes.length}` : ""}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {notes.length === 0 ? (
          <li className="rounded-xl px-2.5 py-2 text-xs text-muted-foreground ring-1 ring-foreground/8">
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
              <p className="flex gap-1.5 text-sm leading-snug text-foreground">
                {tone === "con" ? (
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
                )}
                <span className="min-w-0 font-medium">{note.title}</span>
              </p>
              <p className="mt-0.5 pl-5 text-xs leading-snug text-muted-foreground">
                {note.detail}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
