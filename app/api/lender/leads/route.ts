import { NextResponse } from "next/server";
import { requireLender } from "@/lib/lender-auth";
import { listLenderMarketplace } from "@/lib/persist";

export async function GET() {
  const gate = await requireLender();
  if (gate.error) return gate.error;
  const data = await listLenderMarketplace(gate.email!);
  return NextResponse.json(data);
}
