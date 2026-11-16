import {
  clientAddress,
  consumeRateLimits,
  LIMITS,
  type RateLimitResult,
} from "@/lib/server/rate-limit";

export function openaiRateLimit(
  request: Request,
  userId: string,
): RateLimitResult {
  const ip = clientAddress(request);
  return consumeRateLimits([
    {
      key: `openai:user:${userId}`,
      ...LIMITS.openaiPerUserHour,
    },
    {
      key: `openai:ip:${ip}`,
      ...LIMITS.openaiPerIpHour,
    },
    {
      key: "openai:global",
      ...LIMITS.openaiGlobalHour,
    },
  ]);
}