import { NextResponse } from "next/server";
import { parseAccountRole } from "@/lib/account-role";
import { listLenderMarketplace } from "@/lib/persist";
import { readActiveSession } from "@/lib/session";

export async function GET() {
  const session = await readActiveSession();
  if (!session.signedIn || !session.email) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (parseAccountRole(session.role) !== "lender") {
    return NextResponse.json({ error: "Lender account required" }, { status: 403 });
  }
  const data = await listLenderMarketplace(session.email);
  return NextResponse.json(data);
}
