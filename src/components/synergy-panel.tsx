import type { SynergyNote, SynergyReport } from "@/lib/synergy";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

export function SynergyPanel({
  report,
  compact,
}: {
  report: SynergyReport;
  compact?: boolean;
}) {
  const context = report.notes.filter((note) => note.tone === "info");
  const pros = report.notes.filter((note) => note.tone === "good");
  const cons = report.notes.filter((note) => note.tone === "warn");
  const empty = report.notes.length === 0;

  return (
    <aside
      className={cn(
        compact
          ? "space-y-2"
          : "space-y-4 rounded-2xl bg-card/70 p-3 ring-1 ring-foreground/10 sm:p-4",
      )}
    >
      {compact ? null : (
        <div>
          <p className="font-heading text-xs tracking-[0.2em] text-muted-foreground">
            FORMATION READ
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="font-heading text-xl sm:text-2xl">{report.label}</p>
            <p className="text-sm text-muted-foreground">
              {report.score}/{report.maxScore}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-300"
              style={{ width: `${report.score}%` }}
            />
          </div>
        </div>
      )}
      {empty ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Slot three dragons to see affinity, flanks, and breed coverage.
        </p>
      ) : (
        <div className="space-y-3">
          {context.map((note, i) => (
            <p
              key={`info-${i}`}
              className="flex gap-1.5 text-[13px] leading-snug text-muted-foreground"
            >
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>{note.text}</span>
            </p>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <NoteColumn
              title="Pros"
              empty="Nothing working yet."
              notes={pros}
              tone="pro"
            />
            <NoteColumn
              title="Cons"
              empty="No gaps on this line."
              notes={cons}
              tone="con"
            />
          </div>
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
  notes: SynergyNote[];
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
      <ul className="mt-1.5 max-h-[min(18rem,40vh)] space-y-1.5 overflow-y-auto">
        {notes.length === 0 ? (
          <li className="rounded-xl px-2.5 py-2 text-[13px] text-muted-foreground ring-1 ring-foreground/10">
            {empty}
          </li>
        ) : (
          notes.map((note, i) => (
            <li
              key={`${tone}-${i}`}
              className={cn(
                "rounded-xl px-2.5 py-2 ring-1",
                tone === "con"
                  ? "bg-[#3a1210] text-red-50 ring-[#c34a2c]/70"
                  : "bg-emerald-500/10 ring-emerald-500/30",
              )}
            >
              <p className="flex gap-1.5 text-[13px] leading-snug text-foreground">
                {tone === "con" ? (
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-[#e05a3a]" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
                )}
                <span className="min-w-0">{note.text}</span>
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
