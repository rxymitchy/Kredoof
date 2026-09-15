import { NextResponse } from "next/server";
import { readActiveSession } from "@/lib/session";

export async function GET() {
  const session = await readActiveSession();
  return NextResponse.json(session);
}
