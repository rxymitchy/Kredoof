import { NextResponse } from "next/server";
import { fetchAvalancheStableTransfers, confirmTransfersOnChain, toScoreRows } from "@/lib/avalanche";
import { setUserLastScore, recordQualifiedLead } from "@/lib/persist";
import { apiOrigin, getSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { address?: string };
  if (!body.address) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }
  const session = await getSession();
  const listed = await fetchAvalancheStableTransfers(body.address);
  if (listed.length === 0) {
    return NextResponse.json(
      {
        error: "We did not find payments in this wallet yet.",
        items: [],
      },
      { status: 422 }
    );
  }
  let txs;
  try {
    txs = await confirmTransfersOnChain(listed);
  } catch {
    return NextResponse.json(
      {
        error: "We could not check those payments on the chain. Try again.",
        items: listed,
      },
      { status: 502 }
    );
  }
  if (txs.length === 0) {
    return NextResponse.json(
      {
        error:
          "We found payment records, but none of them exist on the chain yet.",
        items: listed,
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
  const score = Number(profile?.decision?.score);
  const limitKes = Number(profile?.decision?.recommendedLimitKsh);
  if (session.email && Number.isFinite(score)) {
    await setUserLastScore(session.email, score).catch(() => null);
  }
  if (Number.isFinite(limitKes) && limitKes > 0) {
    await recordQualifiedLead({
      email: session.email,
      wallet: body.address,
      score: Number.isFinite(score) ? score : undefined,
      limit_kes: limitKes,
    }).catch(() => null);
  }
  return NextResponse.json({ ...profile, liveTransactions: txs });
}
