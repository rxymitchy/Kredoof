import { NextResponse } from "next/server";
import { deleteUserAccount, hasOpenLoan } from "@/lib/persist";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (!session.email) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (await hasOpenLoan({ email: session.email, wallet: session.wallet })) {
    return NextResponse.json(
      { error: "Pay your loan first, then you can delete this account." },
      { status: 409 }
    );
  }
  try {
    await deleteUserAccount(session.email);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We could not delete this account.",
      },
      { status: 400 }
    );
  }
  session.destroy();
  return NextResponse.json({ ok: true });
}
