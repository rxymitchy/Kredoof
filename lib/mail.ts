async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const from =
    process.env.EMAIL_FROM?.trim() || "Kredoof <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Resend email failed", res.status, detail);
    return false;
  }
  return true;
}

export async function sendRegistrationEmail(input: {
  to: string;
  name: string;
  loginUrl: string;
}): Promise<boolean> {
  const first = input.name.split(" ")[0] || "there";
  return sendEmail({
    to: input.to,
    subject: "Confirm your Kredoof account",
    html: `
      <p>Hi ${first},</p>
      <p>Your Kredoof account is ready.</p>
      <p><a href="${input.loginUrl}">Confirm your email and continue</a></p>
      <p>This link expires in 24 hours. You can also sign in at Kredoof with your password.</p>
    `,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  const first = input.name.split(" ")[0] || "there";
  return sendEmail({
    to: input.to,
    subject: "Reset your Kredoof password",
    html: `
      <p>Hi ${first},</p>
      <p>Use this link to choose a new password:</p>
      <p><a href="${input.resetUrl}">Reset password</a></p>
      <p>This link expires in 1 hour. If you did not ask for this, you can ignore the email.</p>
    `,
  });
}
