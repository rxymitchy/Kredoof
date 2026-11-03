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

function unwrap(raw: string | undefined): string {
  let value = raw?.trim() ?? "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function fromAddress(): string {
  const raw = unwrap(process.env.EMAIL_FROM);
  if (!raw || /vercel\.app/i.test(raw) || /^\[sensitive\]$/i.test(raw)) {
    return RESEND_TEST_FROM;
  }
  return raw;
}

function resendKey(): string {
  const key = unwrap(process.env.RESEND_API_KEY);
  if (!key || /^\[sensitive\]$/i.test(key)) return "";
  return key;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postResend(input: {
  key: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; status: number; retryable: boolean; detail: string }> {
  try {
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
      signal: AbortSignal.timeout(20_000),
    });
    const detail = await res.text().catch(() => "");
    const retryable = res.status === 429 || res.status >= 500;
    return { ok: res.ok, status: res.status, retryable, detail };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network";
    return { ok: false, status: 0, retryable: true, detail };
  }
}

async function sendOnce(
  key: string,
  from: string,
  input: { to: string; subject: string; html: string; text: string }
) {
  return postResend({ key, from, ...input });
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const key = resendKey();
  if (!key) {
    console.error("RESEND_API_KEY is not set; confirmation email was not sent");
    return false;
  }
  const senders = [fromAddress()];
  if (senders[0] !== RESEND_TEST_FROM) senders.push(RESEND_TEST_FROM);

  let last = { ok: false, status: 0, retryable: false, detail: "" };
  for (const from of senders) {
    for (let attempt = 0; attempt < 3; attempt++) {
      last = await sendOnce(key, from, input);
      if (last.ok) return true;
      if (!last.retryable) break;
      await sleep(400 * (attempt + 1));
    }
  }
  console.error("Resend email failed", last.status, last.detail);
  return false;
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
