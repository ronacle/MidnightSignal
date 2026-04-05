import { NextResponse } from "next/server";
import { generateDashboard } from "@/lib/signal-engine";

export async function GET() {
  return NextResponse.json(await generateDashboard());
}
