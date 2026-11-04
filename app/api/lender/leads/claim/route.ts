import { NextResponse } from "next/server";
import { requireLender } from "@/lib/lender-auth";
import { addLenderKes, claimLeadExclusive, spendLenderKes } from "@/lib/persist";
import { LEAD_FEE_KES } from "@/lib/loan-terms";

export async function POST(request: Request) {
  const gate = await requireLender();
  if (gate.error) return gate.error;
  const email = gate.email!;
  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }
  try {
    await spendLenderKes(email, LEAD_FEE_KES);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deposit first" },
      { status: 400 }
    );
  }
  try {
    const lead = await claimLeadExclusive(body.id, email);
    return NextResponse.json({
      lead,
      fee_kes: LEAD_FEE_KES,
      message: `Exclusive file is yours. KSh ${LEAD_FEE_KES} came from your float.`,
    });
  } catch (error) {
    await addLenderKes(email, LEAD_FEE_KES).catch(() => null);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not take that file" },
      { status: 409 }
    );
  }
}
