import { NextResponse } from "next/server";
import { fetchAvalancheStableTransfers, toScoreRows } from "@/lib/avalanche";
import { apiOrigin, getSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { address?: string };
  if (!body.address) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }
  const session = await getSession();
  const txs = await fetchAvalancheStableTransfers(body.address);
  if (txs.length === 0) {
    return NextResponse.json(
      {
        error:
          "We did not find payments in this wallet yet.",
        items: [],
      },
      { status: 422 }
    );
  }
  const name = session.name || "Your business";
  const res = await fetch(`${apiOrigin()}/api/kredoof/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet_id: body.address,
      name,
      owner: session.email?.split("@")[0] ?? "Owner",
      email: session.email,
      transactions: toScoreRows(body.address, txs),
      engine: "ml",
    }),
  });
  const profile = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: profile.detail ?? "We could not finish the review.", items: txs },
      { status: res.status }
    );
  }
  return NextResponse.json({ ...profile, liveTransactions: txs });
}
