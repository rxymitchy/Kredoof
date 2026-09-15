import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  session.nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await session.save();
  return NextResponse.json({ nonce: session.nonce });
}
