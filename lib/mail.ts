import { appOrigin } from "@/lib/session";

const RESEND_TEST_FROM = "Kredoof <onboarding@resend.dev>";

export function confirmEmailUrl(request: Request, token: string): string {
  return `${appOrigin(request)}/onboard?step=confirm&token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fromAddress(): string {
  let raw = process.env.EMAIL_FROM?.trim() ?? "";
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  if (!raw || /vercel\.app/i.test(raw)) return RESEND_TEST_FROM;
  return raw;
}

async function postResend(input: {
  key: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; status: number; detail: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const detail = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, detail };
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.error("RESEND_API_KEY is not set; confirmation email was not sent");
    return false;
  }
  const preferred = fromAddress();
  let result = await postResend({ key, from: preferred, ...input });
  if (!result.ok && preferred !== RESEND_TEST_FROM) {
    console.error(
      "Resend failed with EMAIL_FROM, retrying test sender",
      result.status,
      result.detail
    );
    result = await postResend({ key, from: RESEND_TEST_FROM, ...input });
  }
  if (!result.ok) {
    console.error("Resend email failed", result.status, result.detail);
    return false;
  }
  return true;
}

export async function sendRegistrationEmail(input: {
  to: string;
  name: string;
  loginUrl: string;
}): Promise<boolean> {
  const first = escapeHtml(input.name.split(" ")[0] || "there");
  const url = input.loginUrl;
  return sendEmail({
    to: input.to,
    subject: "Confirm your Kredoof account",
    text: `Hi ${input.name.split(" ")[0] || "there"},\n\nConfirm your Kredoof email:\n${url}\n\nThis link expires in 24 hours.`,
    html: `
      <p>Hi ${first},</p>
      <p>Confirm your email so you can sign in to Kredoof.</p>
      <p><a href="${url}">Confirm my email</a></p>
      <p>Or paste this into your browser:</p>
      <p style="word-break:break-all">${url}</p>
      <p>This link expires in 24 hours. Check spam if you do not see this in your inbox.</p>
    `,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  const first = escapeHtml(input.name.split(" ")[0] || "there");
  const url = input.resetUrl;
  return sendEmail({
    to: input.to,
    subject: "Reset your Kredoof password",
    text: `Hi ${input.name.split(" ")[0] || "there"},\n\nReset your password:\n${url}\n\nThis link expires in 1 hour.`,
    html: `
      <p>Hi ${first},</p>
      <p>Use this link to choose a new password:</p>
      <p><a href="${url}">Reset password</a></p>
      <p>Or paste this into your browser:</p>
      <p style="word-break:break-all">${url}</p>
      <p>This link expires in 1 hour. If you did not ask for this, ignore the email.</p>
    `,
  });
}
