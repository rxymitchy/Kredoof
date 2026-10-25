import { NextResponse } from "next/server";
import { parseAccountRole } from "@/lib/account-role";
import { addLenderKes, claimLeadExclusive, spendLenderKes } from "@/lib/persist";
import { LEAD_FEE_KES } from "@/lib/loan-terms";
import { readActiveSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await readActiveSession();
  if (!session.signedIn || !session.email) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (parseAccountRole(session.role) !== "lender") {
    return NextResponse.json({ error: "Lender account required" }, { status: 403 });
  }
  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }
  try {
    await spendLenderKes(session.email, LEAD_FEE_KES);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Add money first" },
      { status: 400 }
    );
  }
  try {
    const lead = await claimLeadExclusive(body.id, session.email);
    return NextResponse.json({
      lead,
      fee_kes: LEAD_FEE_KES,
      message: `Exclusive file is yours. KSh ${LEAD_FEE_KES} came from your float.`,
    });
  } catch (error) {
    await addLenderKes(session.email, LEAD_FEE_KES).catch(() => null);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not take that file" },
      { status: 409 }
    );
  }
}
