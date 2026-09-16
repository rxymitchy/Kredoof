import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/mail";
import { identifierHint } from "@/lib/account-rules";
import { requestPasswordReset } from "@/lib/persist";
import { appOrigin } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { identifier?: string; email?: string };
  const identifier = body.identifier ?? body.email ?? "";
  const invalid = identifierHint(identifier);
  if (invalid) {
    return NextResponse.json({ error: invalid, field: "email" }, { status: 400 });
  }
  const data = await requestPasswordReset(identifier).catch(() => null);
  if (!data) {
    return NextResponse.json({ ok: true });
  }
  const resetUrl = `${appOrigin(request)}/onboard?step=reset&token=${data.resetToken}`;
  const emailSent = await sendPasswordResetEmail({
    to: data.email,
    name: data.name,
    resetUrl,
  }).catch(() => false);
  if (!emailSent) {
    return NextResponse.json(
      { error: "Could not send the reset email. Try again in a moment." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
