import { createHmac, timingSafeEqual } from "crypto";
import { KES_PER_USDT } from "@/lib/constants";
import { normalizePhone } from "@/lib/account-rules";
import { appOrigin } from "@/lib/session";
import type { DepositMethod } from "@/lib/persist";

export type MethodInfo = {
  id: DepositMethod;
  label: string;
  hint: string;
  available: boolean;
};

function envOn(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function paymentMethods(): MethodInfo[] {
  return [
    {
      id: "mpesa",
      label: "M-Pesa",
      hint: mpesaReady()
        ? "We send a prompt to your phone. Balance updates when Safaricom confirms."
        : "Needs a Safaricom Daraja till (consumer key, secret, shortcode, passkey).",
      available: mpesaReady(),
    },
    {
      id: "avalanche",
      label: "Avalanche wallet",
      hint: "Send USDT from MetaMask, Core, or Trust Wallet. Balance updates when the chain confirms.",
      available: true,
    },
  ];
}

export function mpesaReady(): boolean {
  return (
    envOn("MPESA_CONSUMER_KEY") &&
    envOn("MPESA_CONSUMER_SECRET") &&
    envOn("MPESA_SHORTCODE") &&
    envOn("MPESA_PASSKEY")
  );
}

export function paypalReady(): boolean {
  return envOn("PAYPAL_CLIENT_ID") && envOn("PAYPAL_CLIENT_SECRET");
}

export function stripeReady(): boolean {
  return envOn("STRIPE_SECRET_KEY");
}

export function methodReady(method: DepositMethod): boolean {
  if (method === "mpesa") return mpesaReady();
  if (method === "avalanche") return true;
  return false;
}

function paypalBase(): string {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function mpesaBase(): string {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export async function startCardCheckout(input: {
  depositId: string;
  kes: number;
  email: string;
  origin: string;
}): Promise<{ url: string; providerRef: string }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Card deposits are not connected yet");
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${input.origin}/api/lender/deposit/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/lend?deposit=cancel`,
    "line_items[0][price_data][currency]": "kes",
    "line_items[0][price_data][product_data][name]": "Kredoof lender deposit",
    "line_items[0][price_data][unit_amount]": String(input.kes * 100),
    "line_items[0][quantity]": "1",
    client_reference_id: input.depositId,
    customer_email: input.email,
    "metadata[depositId]": input.depositId,
    "metadata[email]": input.email,
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.id || !data.url) {
    throw new Error(data.error?.message || "Could not start card checkout");
  }
  return { url: data.url, providerRef: data.id };
}

export async function retrieveStripeSession(sessionId: string): Promise<{
  depositId: string | null;
  paid: boolean;
}> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !sessionId) return { depositId: null, paid: false };
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = (await res.json()) as {
    payment_status?: string;
    client_reference_id?: string;
    metadata?: { depositId?: string };
  };
  return {
    depositId: data.metadata?.depositId || data.client_reference_id || null,
    paid: res.ok && data.payment_status === "paid",
  };
}

export function verifyStripeSignature(raw: string, header: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((item) => {
      const [k, ...rest] = item.split("=");
      return [k.trim(), rest.join("=")];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startPaypalCheckout(input: {
  depositId: string;
  kes: number;
  origin: string;
}): Promise<{ url: string; providerRef: string }> {
  const token = await paypalAccessToken();
  const usd = Math.max(1, Math.round((input.kes / KES_PER_USDT) * 100) / 100).toFixed(2);
  const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: input.depositId,
          amount: { currency_code: "USD", value: usd },
        },
      ],
      application_context: {
        brand_name: "Kredoof",
        return_url: `${input.origin}/api/lender/deposit/paypal/return`,
        cancel_url: `${input.origin}/lend?deposit=cancel`,
      },
    }),
  });
  const data = (await res.json()) as {
    id?: string;
    links?: { rel?: string; href?: string }[];
    message?: string;
  };
  const url = data.links?.find((link) => link.rel === "approve")?.href;
  if (!res.ok || !data.id || !url) {
    throw new Error(data.message || "Could not start PayPal checkout");
  }
  return { url, providerRef: data.id };
}

export async function capturePaypalOrder(orderId: string): Promise<{
  depositId: string | null;
  captured: boolean;
}> {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = (await res.json()) as {
    status?: string;
    purchase_units?: Array<{ custom_id?: string }>;
  };
  const depositId = data.purchase_units?.[0]?.custom_id ?? null;
  return {
    depositId,
    captured: res.ok && String(data.status).toUpperCase() === "COMPLETED",
  };
}

async function paypalAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error("PayPal is not connected yet");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal could not sign in");
  return data.access_token;
}

export async function startMpesaStk(input: {
  depositId: string;
  kes: number;
  phone: string;
  origin: string;
}): Promise<{ providerRef: string }> {
  const shortcode = process.env.MPESA_SHORTCODE?.trim();
  const passkey = process.env.MPESA_PASSKEY?.trim();
  if (!shortcode || !passkey) throw new Error("M-Pesa is not connected yet");
  const phone = mpesaMsisdn(input.phone);
  if (!phone) throw new Error("Add a Kenyan mobile number first");
  const timestamp = mpesaTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const token = await mpesaAccessToken();
  const callback =
    process.env.MPESA_CALLBACK_URL?.trim() ||
    `${input.origin}/api/lender/deposit/mpesa/callback`;
  const res = await fetch(`${mpesaBase()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: input.kes,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callback,
      AccountReference: "Kredoof",
      TransactionDesc: `Deposit ${input.depositId}`,
    }),
  });
  const data = (await res.json()) as {
    CheckoutRequestID?: string;
    errorMessage?: string;
    CustomerMessage?: string;
    ResponseDescription?: string;
  };
  if (!res.ok || !data.CheckoutRequestID) {
    throw new Error(
      data.errorMessage || data.ResponseDescription || "Could not send the M-Pesa prompt"
    );
  }
  return { providerRef: data.CheckoutRequestID };
}

export function parseMpesaCallback(body: unknown): {
  providerRef: string | null;
  paid: boolean;
} {
  const stk =
    body && typeof body === "object" && "Body" in body
      ? (body as { Body?: { stkCallback?: { CheckoutRequestID?: string; ResultCode?: number } } })
          .Body?.stkCallback
      : null;
  return {
    providerRef: stk?.CheckoutRequestID ?? null,
    paid: stk?.ResultCode === 0,
  };
}

function mpesaMsisdn(raw: string): string | null {
  const digits = normalizePhone(raw);
  if (!digits.startsWith("254") || digits.length < 12) return null;
  return digits;
}

function mpesaTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function mpesaAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY?.trim();
  const secret = process.env.MPESA_CONSUMER_SECRET?.trim();
  if (!key || !secret) throw new Error("M-Pesa is not connected yet");
  const res = await fetch(
    `${mpesaBase()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      },
    }
  );
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("M-Pesa could not sign in");
  return data.access_token;
}

export function depositOrigin(request: Request): string {
  return appOrigin(request);
}
