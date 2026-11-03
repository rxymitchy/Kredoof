import { NextResponse } from "next/server";
import { requireLender } from "@/lib/lender-auth";
import { usdtFromKes } from "@/lib/format";
import { getLenderKesFloat } from "@/lib/persist";

export async function GET() {
  const gate = await requireLender();
  if (gate.error) return gate.error;
  try {
    const kes = await getLenderKesFloat(gate.email!);
    return NextResponse.json({ kes, usdt: usdtFromKes(kes) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load your money" },
      { status: 400 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Typed-in money is gone. Deposit with M-Pesa or an Avalanche wallet." },
    { status: 410 }
  );
}
