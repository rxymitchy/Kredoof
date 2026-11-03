import { NextResponse } from "next/server";
import { confirmLenderDeposit, failLenderDeposit, getDepositByProviderRef } from "@/lib/persist";
import { parseMpesaCallback } from "@/lib/payments";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseMpesaCallback(body);
  if (!parsed.providerRef) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
  if (parsed.paid) {
    await confirmLenderDeposit({ providerRef: parsed.providerRef });
  } else {
    const deposit = await getDepositByProviderRef(parsed.providerRef);
    if (deposit) await failLenderDeposit(deposit.id);
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
