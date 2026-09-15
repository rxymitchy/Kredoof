import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    signedIn: Boolean(session.signedIn),
    email: session.email ?? null,
    name: session.name ?? null,
    wallet: session.wallet ?? null,
  });
}
