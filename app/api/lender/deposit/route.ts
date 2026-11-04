import { NextResponse } from "next/server";
import { isValidPhone } from "@/lib/account-rules";
import { requireLender } from "@/lib/lender-auth";
import { usdtFromKes } from "@/lib/format";
import {
  confirmLenderDeposit,
  createLenderDeposit,
  getDepositByProviderRef,
  getLenderKesFloat,
  getPublicAccount,
  listLenderDeposits,
  setDepositProviderRef,
  type DepositMethod,
} from "@/lib/persist";
import {
  depositOrigin,
  methodReady,
  paymentMethods,
  startMpesaStk,
} from "@/lib/payments";
import { verifyAvalancheUsdtDeposit } from "@/lib/verify-deposit";

function parseMethod(value: unknown): DepositMethod | null {
  if (value === "mpesa" || value === "avalanche") return value;
  return null;
}

export async function GET() {
  const gate = await requireLender();
  if (gate.error) return gate.error;
  const email = gate.email!;
  const [kes, deposits, account] = await Promise.all([
    getLenderKesFloat(email),
    listLenderDeposits(email),
    getPublicAccount(email),
  ]);
  return NextResponse.json({
    kes,
    usdt: usdtFromKes(kes),
    methods: paymentMethods(),
    deposits,
    phone: account?.phone ?? "",
  });
}

export async function POST(request: Request) {
  const gate = await requireLender();
  if (gate.error) return gate.error;
  const email = gate.email!;
  const body = (await request.json()) as {
    kes?: number;
    method?: string;
    phone?: string;
    hash?: string;
  };
  const method = parseMethod(body.method);
  if (!method) {
    return NextResponse.json(
      { error: "Pick M-Pesa or an Avalanche wallet" },
      { status: 400 }
    );
  }
  if (!methodReady(method)) {
    return NextResponse.json(
      {
        error:
          method === "mpesa"
            ? "M-Pesa is not connected yet. We need a Safaricom Daraja till."
            : "Connect an Avalanche wallet and send USDT.",
      },
      { status: 501 }
    );
  }
  try {
    if (method === "avalanche") {
      const hash = String(body.hash ?? "").trim();
      const existing = await getDepositByProviderRef(hash);
      if (existing?.status === "confirmed") {
        const kes = await getLenderKesFloat(email);
        return NextResponse.json({
          id: existing.id,
          kes,
          message: "That wallet payment is already in your balance.",
        });
      }
      await verifyAvalancheUsdtDeposit({ hash, kes: Number(body.kes) });
      const deposit = await createLenderDeposit({
        email,
        kes: Number(body.kes),
        method,
      });
      await setDepositProviderRef(deposit.id, hash);
      await confirmLenderDeposit({ id: deposit.id, providerRef: hash });
      const kes = await getLenderKesFloat(email);
      return NextResponse.json({
        id: deposit.id,
        kes,
        message: "USDT received on Avalanche. Your wallet is updated.",
      });
    }

    const deposit = await createLenderDeposit({
      email,
      kes: Number(body.kes),
      method,
    });
    const origin = depositOrigin(request);
    const account = await getPublicAccount(email);
    const phone = String(body.phone || account?.phone || "");
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Add a Kenyan mobile number for M-Pesa" },
        { status: 400 }
      );
    }
    const started = await startMpesaStk({
      depositId: deposit.id,
      kes: deposit.kes,
      phone,
      origin,
    });
    await setDepositProviderRef(deposit.id, started.providerRef);
    return NextResponse.json({
      id: deposit.id,
      waiting: true,
      message:
        "Check your phone and enter your M-Pesa PIN. Your balance updates when the payment lands.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start the deposit" },
      { status: 400 }
    );
  }
}
