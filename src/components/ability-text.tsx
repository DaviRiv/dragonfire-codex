import { Badge } from "@/components/ui/badge";
import {
  TONE_BADGE_CLASS,
  TONE_TEXT_CLASS,
  tokenizeAbilityText,
  toneForPhrase,
} from "@/lib/ability-text";
import { cn } from "@/lib/utils";

export function AbilityText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = tokenizeAbilityText(text);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.tone ? (
          <span key={i} className={TONE_TEXT_CLASS[part.tone]}>
            {part.value}
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </span>
  );
}

export function AbilityTag({ tag }: { tag: string }) {
  const tone = toneForPhrase(tag);
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-normal", tone && TONE_BADGE_CLASS[tone])}
    >
      {tag}
    </Badge>
  );
}
