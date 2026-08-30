import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { SynergyReport } from "@/lib/synergy";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

export function SynergyPanel({ report }: { report: SynergyReport }) {
  return (
    <aside className="space-y-4 rounded-2xl bg-card/70 p-4 ring-1 ring-foreground/10">
      <div>
        <p className="font-heading text-xs tracking-[0.2em] text-muted-foreground">
          FORMATION READ
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="font-heading text-2xl">{report.label}</p>
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
      <div className="space-y-2">
        {report.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Slot dragons to see affinity, flank habits, and breed coverage.
          </p>
        ) : (
          report.notes.map((note, i) => (
            <Alert
              key={i}
              className={cn(
                note.tone === "good" && "border-emerald-500/30 bg-emerald-500/10",
                note.tone === "warn" && "border-amber-500/30 bg-amber-500/10",
              )}
            >
              {note.tone === "good" ? (
                <CheckCircle2 />
              ) : note.tone === "warn" ? (
                <TriangleAlert />
              ) : (
                <Info />
              )}
              <AlertTitle className="sr-only">{note.tone}</AlertTitle>
              <AlertDescription className="text-foreground/90">
                {note.text}
              </AlertDescription>
            </Alert>
          ))
        )}
      </div>
    </aside>
  );
}
