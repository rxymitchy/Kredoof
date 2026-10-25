import { NextResponse } from "next/server";
import { parseAccountRole } from "@/lib/account-role";
import { KES_PER_USDT } from "@/lib/constants";
import { usdtFromKes } from "@/lib/format";
import { addLenderKes, getLenderKesFloat } from "@/lib/persist";
import { readActiveSession } from "@/lib/session";

function payload(kes: number) {
  return { kes, usdt: usdtFromKes(kes) };
}

export async function GET() {
  const session = await readActiveSession();
  if (!session.signedIn || !session.email) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (parseAccountRole(session.role) !== "lender") {
    return NextResponse.json({ error: "Lender account required" }, { status: 403 });
  }
  try {
    const kes = await getLenderKesFloat(session.email);
    return NextResponse.json(payload(kes));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load your money" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const session = await readActiveSession();
  if (!session.signedIn || !session.email) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (parseAccountRole(session.role) !== "lender") {
    return NextResponse.json({ error: "Lender account required" }, { status: 403 });
  }
  const body = (await request.json()) as { kes?: number; usdt?: number };
  const fromUsdt =
    typeof body.usdt === "number" && body.usdt > 0
      ? Math.round(body.usdt * KES_PER_USDT)
      : 0;
  const kes = Math.round(Number(body.kes || fromUsdt || 0));
  try {
    const next = await addLenderKes(session.email, kes);
    return NextResponse.json(payload(next));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add money" },
      { status: 400 }
    );
  }
}
