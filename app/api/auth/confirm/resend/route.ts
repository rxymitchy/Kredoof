import { NextResponse } from "next/server";
import { confirmEmailUrl, sendRegistrationEmail } from "@/lib/mail";
import { getUserByEmail, issueEmailConfirmToken } from "@/lib/persist";
import { clientKey, retryAfterSeconds, tooSoon } from "@/lib/rate-limit";
import { readActiveSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await readActiveSession();
  if (!session.signedIn || !session.email) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  const wait = await tooSoon(clientKey(request, "confirm-resend"), 1, 30 * 60 * 1000);
  if (wait > 0) {
    return NextResponse.json(
      { error: "Wait a few minutes before asking for another link." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(wait)) },
      }
    );
  }
  const user = await getUserByEmail(session.email);
  if (!user) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  const issued = await issueEmailConfirmToken(user.email);
  if (!issued) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  if (!issued.token) {
    return NextResponse.json({ ok: true, alreadySent: true });
  }
  const emailSent = await sendRegistrationEmail({
    to: issued.email,
    name: issued.name,
    loginUrl: confirmEmailUrl(request, issued.token),
  }).catch(() => false);
  if (!emailSent) {
    return NextResponse.json(
      { error: "Could not send that email. Try again in a moment." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
