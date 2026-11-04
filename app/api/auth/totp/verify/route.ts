import { NextResponse } from "next/server";
import { enableTotp, getUserByEmail, LoginError } from "@/lib/persist";
import { parseAccountRole } from "@/lib/account-role";
import { clientKey, retryAfterSeconds, tooSoon } from "@/lib/rate-limit";
import { establishSession, getSession } from "@/lib/session";
import { verifyTotp } from "@/lib/totp";

export async function POST(request: Request) {
  const wait = await tooSoon(clientKey(request, "totp"), 8, 15 * 60 * 1000);
  if (wait > 0) {
    return NextResponse.json(
      { error: "Too many codes. Wait a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(wait)) },
      }
    );
  }
  const session = await getSession();
  const email =
    session.totpPendingEmail || (session.signedIn ? session.email : null);
  if (!email) {
    return NextResponse.json(
      { error: "Sign in with your password first." },
      { status: 401 }
    );
  }
  const body = (await request.json()) as { code?: string };
  const code = body.code ?? "";
  try {
    const user = await getUserByEmail(email);
    if (!user) throw new LoginError("credentials", "That code did not match.");
    if (user.totpEnabled && user.totpSecret) {
      if (!verifyTotp(user.totpSecret, code)) {
        throw new LoginError("password", "That code did not match. Try again.");
      }
      await establishSession({
        email: user.email,
        phone: user.phone,
        name: user.name,
        wallet: user.wallet,
        role: parseAccountRole(user.role),
      });
      return NextResponse.json({
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: parseAccountRole(user.role),
      });
    }
    const secret = session.totpPendingSecret;
    if (!secret || !verifyTotp(secret, code)) {
      throw new LoginError("password", "That code did not match. Try again.");
    }
    const data = await enableTotp(user.email, secret);
    await establishSession({
      email: data.email,
      phone: data.phone,
      name: data.name,
      wallet: data.wallet,
      role: data.role,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That code did not match.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
