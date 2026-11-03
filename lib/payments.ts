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

export function methodReady(method: DepositMethod): boolean {
  if (method === "mpesa") return mpesaReady();
  if (method === "avalanche") return true;
  return false;
}

function mpesaBase(): string {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
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
