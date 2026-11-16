import Link from "next/link";
import { TalkLineChip } from "@/components/talk-line";
import { talkCategoryLabels, type TalkThreadSummary } from "@/lib/talk-types";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TalkThreadCard({
  thread,
  className,
}: {
  thread: TalkThreadSummary;
  className?: string;
}) {
  return (
    <Link
      href={`/talk/${thread.id}`}
      className={cn(
        "block rounded-2xl surface px-3 py-3 ring-1 ring-foreground/10 hover:bg-muted/50 sm:px-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="rounded-full px-2 py-0.5 text-[11px] tracking-wide text-amber-100 ring-1 ring-amber-400/35">
          {talkCategoryLabels[thread.category]}
        </span>
        <h2 className="font-heading min-w-0 flex-1 text-base tracking-wide">
          {thread.title}
        </h2>
      </div>
      {thread.line ? (
        <div className="mt-1">
          <TalkLineChip line={thread.line} />
        </div>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        {thread.author} · {thread.replyCount}{" "}
        {thread.replyCount === 1 ? "reply" : "replies"} · last{" "}
        {formatWhen(thread.lastReplyAt)}
      </p>
    </Link>
  );
}
