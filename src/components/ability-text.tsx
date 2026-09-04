"use client";

import { AbilityHover } from "@/components/ability-insight";
import { Badge } from "@/components/ui/badge";
import {
  TONE_BADGE_CLASS,
  TONE_TEXT_CLASS,
  tokenizeAbilityText,
  toneForPhrase,
} from "@/lib/ability-text";
import type { AbilitySourceRef } from "@/lib/ability-insight";
import { findAbilityInsight } from "@/lib/ability-insight";
import { cn } from "@/lib/utils";

export function AbilityText({
  text,
  className,
  dragonId,
  source,
  interactive,
}: {
  text: string;
  className?: string;
  dragonId?: string;
  source?: AbilitySourceRef;
  interactive?: boolean;
}) {
  const enableHover = interactive ?? !!dragonId;
  const parts = tokenizeAbilityText(text);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const colored = part.tone ? (
          <span className={TONE_TEXT_CLASS[part.tone]}>{part.value}</span>
        ) : (
          <span>{part.value}</span>
        );
        if (!enableHover || !part.tone) {
          return <span key={i}>{colored}</span>;
        }
        const insight = findAbilityInsight(part.value, { dragonId, source });
        if (!insight) {
          return <span key={i}>{colored}</span>;
        }
        return (
          <AbilityHover
            key={i}
            name={part.value}
            dragonId={dragonId}
            source={source}
            insight={insight}
          >
            {colored}
          </AbilityHover>
        );
      })}
    </span>
  );
}

export function AbilityTag({
  tag,
  dragonId,
}: {
  tag: string;
  dragonId?: string;
}) {
  const tone = toneForPhrase(tag);
  const chip = (
    <Badge
      variant="outline"
      className={cn("rounded-md font-normal", tone && TONE_BADGE_CLASS[tone])}
    >
      {tag}
    </Badge>
  );
  if (!dragonId && !findAbilityInsight(tag)) return chip;
  return (
    <AbilityHover name={tag} dragonId={dragonId}>
      {chip}
    </AbilityHover>
  );
}
