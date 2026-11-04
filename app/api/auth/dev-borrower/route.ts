import { NextResponse } from "next/server";
import { isLocalDev } from "@/lib/lender-auth";
import { ensureDevBorrower } from "@/lib/persist";
import { establishSession } from "@/lib/session";

/** Local `next dev` only. Opens the borrower dashboard without a real login. */
export async function POST() {
  if (!isLocalDev()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = await ensureDevBorrower();
  await establishSession({
    email: user.email,
    phone: user.phone,
    name: user.name,
    wallet: user.wallet,
    role: "borrower",
  });
  return NextResponse.json({ ok: true, role: "borrower", email: user.email });
}
