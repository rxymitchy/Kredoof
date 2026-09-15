import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/mail";
import { emailHint } from "@/lib/account-rules";
import { requestPasswordReset } from "@/lib/persist";
import { appOrigin } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email ?? "";
  const invalid = emailHint(email);
  if (invalid) {
    return NextResponse.json({ error: invalid, field: "email" }, { status: 400 });
  }
  const data = await requestPasswordReset(email).catch(() => null);
  if (data) {
    const resetUrl = `${appOrigin(request)}/onboard?step=reset&token=${data.resetToken}`;
    await sendPasswordResetEmail({
      to: data.email,
      name: data.name,
      resetUrl,
    }).catch(() => false);
  }
  return NextResponse.json({ ok: true });
}
