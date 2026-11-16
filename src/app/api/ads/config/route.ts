import { NextResponse } from "next/server";
import { serverAdsConfig } from "@/lib/server/ads-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(serverAdsConfig());
}