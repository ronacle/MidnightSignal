import { NextResponse } from "next/server";
import { triggerAlert } from "@/lib/alert-engine";

export async function POST() {
  return NextResponse.json(triggerAlert());
}

export async function GET() {
  return NextResponse.json(triggerAlert());
}
