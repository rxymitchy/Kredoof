import { NextResponse } from "next/server";
import { parseAccountRole } from "@/lib/account-role";
import { ensureDevLender } from "@/lib/persist";
import { establishSession, readActiveSession } from "@/lib/session";

export function isLocalDev() {
  return process.env.NODE_ENV === "development";
}

/** Lender cookie, or a local-only test lender when running `next dev`. */
export async function requireLender() {
  const session = await readActiveSession();
  if (
    session.signedIn &&
    session.email &&
    parseAccountRole(session.role) === "lender"
  ) {
    return { email: session.email, error: null as NextResponse | null };
  }
  if (isLocalDev()) {
    const user = await ensureDevLender();
    await establishSession({
      email: user.email,
      phone: user.phone,
      name: user.name,
      wallet: user.wallet,
      role: "lender",
    });
    return { email: user.email, error: null as NextResponse | null };
  }
  if (!session.signedIn || !session.email) {
    return {
      email: null,
      error: NextResponse.json({ error: "Sign in first" }, { status: 401 }),
    };
  }
  return {
    email: null,
    error: NextResponse.json({ error: "Lender account required" }, { status: 403 }),
  };
}
