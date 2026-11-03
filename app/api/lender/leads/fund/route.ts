import { NextResponse } from "next/server";
import { requireLender } from "@/lib/lender-auth";
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
import { clientKey, retryAfterSeconds, tooSoon } from "@/lib/rate-limit";
import { disburseFromTreasury, treasuryErrorMessage } from "@/lib/treasury-disburse";

export async function POST(request: Request) {
  const wait = await tooSoon(clientKey(request, "fund"), 8, 10 * 60 * 1000);
  if (wait > 0) {
    return NextResponse.json(
      { error: "Too many fund attempts. Wait a minute." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(wait)) } }
    );
  }
  const gate = await requireLender();
  if (gate.error) return gate.error;
  const email = gate.email!;
  const body = (await request.json()) as { id?: string; termDays?: number };
  if (!body.id) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }
  const lead = await getClaimedLeadForLender(body.id, email);
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
    await spendLenderKes(email, kesNeeded);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deposit first" },
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
    await addLenderKes(email, kesNeeded).catch(() => null);
    const { error, status } = treasuryErrorMessage(err);
    return NextResponse.json({ error }, { status });
  }
}
