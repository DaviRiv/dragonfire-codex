import {
  consumeRateLimit,
  LIMITS,
  type RateLimitResult,
} from "@/lib/server/rate-limit";

export function guardTalkThread(userId: string): RateLimitResult {
  return consumeRateLimit(
    `write:talk-thread:${userId}`,
    LIMITS.talkThreadPerUserDay.limit,
    LIMITS.talkThreadPerUserDay.windowMs,
  );
}

export function guardTalkReply(userId: string): RateLimitResult {
  return consumeRateLimit(
    `write:talk-reply:${userId}`,
    LIMITS.talkReplyPerUserHour.limit,
    LIMITS.talkReplyPerUserHour.windowMs,
  );
}

export function guardBoardSuggest(userId: string): RateLimitResult {
  return consumeRateLimit(
    `write:board-suggest:${userId}`,
    LIMITS.boardSuggestPerUserDay.limit,
    LIMITS.boardSuggestPerUserDay.windowMs,
  );
}

export function guardBoardComment(userId: string): RateLimitResult {
  return consumeRateLimit(
    `write:board-comment:${userId}`,
    LIMITS.boardCommentPerUserHour.limit,
    LIMITS.boardCommentPerUserHour.windowMs,
  );
}

export function guardBoardRate(userId: string): RateLimitResult {
  return consumeRateLimit(
    `write:board-rate:${userId}`,
    LIMITS.boardRatePerUserHour.limit,
    LIMITS.boardRatePerUserHour.windowMs,
  );
}