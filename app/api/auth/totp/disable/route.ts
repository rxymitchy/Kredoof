import { NextResponse } from "next/server";
import { disableTotp } from "@/lib/persist";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session.signedIn || !session.email) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const data = await disableTotp(session.email);
  return NextResponse.json({
    ok: true,
    totpEnabled: data.totpEnabled,
  });
}
