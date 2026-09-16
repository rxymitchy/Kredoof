import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { apiOrigin, establishSession, getSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    address?: string;
    signature?: string;
    email?: string;
  };
  const session = await getSession();
  if (!body.address || !body.signature || !session.nonce) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const message = [
    "Kredoof wants to confirm this is your wallet:",
    body.address,
    "",
    `Nonce: ${session.nonce}`,
  ].join("\n");
  const ok = await verifyMessage({
    address: body.address as `0x${string}`,
    message,
    signature: body.signature as `0x${string}`,
  });
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  session.wallet = body.address.toLowerCase();
  session.nonce = undefined;
  const email = body.email?.toLowerCase() || session.email;
  if (email) session.email = email;
  await establishSession({
    email,
    name: session.name,
    wallet: session.wallet,
  });
  if (email) {
    const { bindUserWallet } = await import("@/lib/persist");
    await bindUserWallet(email, session.wallet).catch(() => null);
    await fetch(`${apiOrigin()}/api/accounts/bind-wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, wallet: session.wallet }),
      signal: AbortSignal.timeout(2500),
    }).catch(() => null);
  }
  return NextResponse.json({
    wallet: session.wallet,
    email: session.email,
    name: session.name,
  });
}
