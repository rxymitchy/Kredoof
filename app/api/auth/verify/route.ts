import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { getSession } from "@/lib/session";
import { apiOrigin } from "@/lib/session";

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
    "Kredoof wants you to sign in with your Avalanche account:",
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
  session.signedIn = true;
  session.nonce = undefined;
  if (body.email) session.email = body.email.toLowerCase();
  await session.save();
  if (session.email) {
    const { bindUserWallet } = await import("@/lib/persist");
    await bindUserWallet(session.email, session.wallet).catch(() => null);
    await fetch(`${apiOrigin()}/api/accounts/bind-wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.email, wallet: session.wallet }),
    }).catch(() => null);
  }
  return NextResponse.json({
    wallet: session.wallet,
    email: session.email,
    name: session.name,
  });
}
