import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/persist";
import { getSession, stashTotpEnrollSecret } from "@/lib/session";
import { generateTotpSecret, totpAccountName, totpOtpauthUrl } from "@/lib/totp";

export async function GET() {
  const session = await getSession();
  const email = session.totpPendingEmail || (session.signedIn ? session.email : null);
  if (!email) {
    return NextResponse.json(
      { error: "Sign in with your password first." },
      { status: 401 }
    );
  }
  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with your password first." },
      { status: 401 }
    );
  }
  if (user.totpEnabled) {
    return NextResponse.json({ enroll: false, email: user.email });
  }
  const secret = session.totpPendingSecret || generateTotpSecret();
  if (!session.totpPendingSecret) {
    await stashTotpEnrollSecret(secret);
  }
  return NextResponse.json({
    enroll: true,
    optional: Boolean(session.signedIn),
    email: user.email,
    account: totpAccountName(user.email),
    secret,
    otpauthUrl: totpOtpauthUrl(user.email, secret),
  });
}
