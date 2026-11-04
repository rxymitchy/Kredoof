import { NextResponse } from "next/server";
import { clientKey, retryAfterSeconds, tooSoon } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const wait = await tooSoon(clientKey(request, "nonce"), 30, 10 * 60 * 1000);
  if (wait > 0) {
    return NextResponse.json(
      { error: "Too many wallet checks. Wait a bit." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(wait)) },
      }
    );
  }
  const session = await getSession();
  session.nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await session.save();
  return NextResponse.json({ nonce: session.nonce });
}
