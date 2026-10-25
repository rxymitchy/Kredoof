import { NextResponse } from "next/server";
import { parseAccountRole } from "@/lib/account-role";
import {
  addLenderKes,
  getClaimedLeadForLender,
  hasOpenLoan,
  spendLenderKes,
} from "@/lib/persist";
import { usdtFromKes } from "@/lib/format";
import {
  LONG_TERM_DAYS,
  SHORT_TERM_DAYS,
} from "@/lib/loan-terms";
import { readActiveSession } from "@/lib/session";
import { disburseFromTreasury, treasuryErrorMessage } from "@/lib/treasury-disburse";

export async function POST(request: Request) {
  const session = await readActiveSession();
  if (!session.signedIn || !session.email) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (parseAccountRole(session.role) !== "lender") {
    return NextResponse.json({ error: "Lender account required" }, { status: 403 });
  }
  const body = (await request.json()) as { id?: string; termDays?: number };
  if (!body.id) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }
  const lead = await getClaimedLeadForLender(body.id, session.email);
  if (!lead) {
    return NextResponse.json(
      { error: "Take this file first. Only the exclusive lender can fund it." },
      { status: 403 }
    );
  }
  if (lead.status === "funded") {
    return NextResponse.json({ error: "Already funded" }, { status: 409 });
  }
  const amountUsdc = usdtFromKes(lead.limit_kes ?? 0);
  if (amountUsdc <= 0) {
    return NextResponse.json({ error: "This file has no amount to fund" }, { status: 400 });
  }
  if (await hasOpenLoan({ email: lead.email, wallet: lead.wallet })) {
    return NextResponse.json(
      { error: "This borrower already has an open loan." },
      { status: 409 }
    );
  }
  const termDays =
    body.termDays === LONG_TERM_DAYS ? LONG_TERM_DAYS : SHORT_TERM_DAYS;
  const kesNeeded = Math.round(lead.limit_kes ?? 0);
  try {
    await spendLenderKes(session.email, kesNeeded);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Add money first" },
      { status: 400 }
    );
  }
  try {
    const { hash, loan } = await disburseFromTreasury({
      to: lead.wallet as `0x${string}`,
      amountUsdc,
      termDays,
      borrowerEmail: lead.email,
      leadId: lead.id,
    });
    return NextResponse.json({ hash, loan });
  } catch (err) {
    await addLenderKes(session.email, kesNeeded).catch(() => null);
    const { error, status } = treasuryErrorMessage(err);
    return NextResponse.json({ error }, { status });
  }
}
