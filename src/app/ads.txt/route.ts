import { adsensePublisherId } from "@/lib/server/ads-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Required for AdSense site verification on your published hostname. */
export async function GET() {
  const pub = adsensePublisherId();
  const body = pub
    ? `google.com, pub-${pub}, DIRECT, f08c47fec0942fa0\n`
    : "# Set ADSENSE_CLIENT to your ca-pub- id, then republish.\n";
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}