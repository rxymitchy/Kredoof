import { NextResponse } from "next/server";
import { isValidName, phoneHint } from "@/lib/account-rules";
import {
  DuplicateAccountError,
  getPublicAccount,
  updatePublicProfile,
} from "@/lib/persist";
import { establishSession, readActiveSession } from "@/lib/session";

async function requireAccountEmail() {
  const session = await readActiveSession();
  if (!session.signedIn || !session.email) {
    return {
      email: null as string | null,
      error: NextResponse.json({ error: "Sign in first" }, { status: 401 }),
    };
  }
  return { email: session.email, error: null as NextResponse | null };
}

export async function GET() {
  const gate = await requireAccountEmail();
  if (gate.error) return gate.error;
  const account = await getPublicAccount(gate.email!);
  if (!account) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  return NextResponse.json(account);
}

export async function PATCH(request: Request) {
  const gate = await requireAccountEmail();
  if (gate.error) return gate.error;
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const phone = String(body.phone ?? "");
  if (!isValidName(firstName) || !isValidName(lastName)) {
    return NextResponse.json({ error: "Use your real first and last name" }, { status: 400 });
  }
  const phoneError = phoneHint(phone);
  if (phoneError) {
    return NextResponse.json({ error: phoneError }, { status: 400 });
  }
  try {
    const account = await updatePublicProfile(gate.email!, {
      firstName,
      lastName,
      phone,
    });
    await establishSession({
      email: account.email,
      phone: account.phone,
      name: account.name,
      wallet: account.wallet,
      role: account.role,
    });
    return NextResponse.json(account);
  } catch (error) {
    const status = error instanceof DuplicateAccountError ? 409 : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save" },
      { status }
    );
  }
}
