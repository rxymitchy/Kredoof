import { NextResponse } from "next/server";
import { confirmEmailToken } from "@/lib/persist";
import { normalizeEmail } from "@/lib/account-rules";
import { appOrigin, readActiveSession } from "@/lib/session";

/** Mail apps often prefetch GET links. Send people to a button instead of consuming the token. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const origin = appOrigin(request);
  const next = new URL("/onboard", origin);
  next.searchParams.set("step", "confirm");
  if (token) next.searchParams.set("token", token);
  return NextResponse.redirect(next);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim() ?? "";
  try {
    const account = await confirmEmailToken(token);
    const session = await readActiveSession();
    const staySignedIn = Boolean(
      session.signedIn &&
        session.email &&
        normalizeEmail(session.email) === normalizeEmail(account.email)
    );
    return NextResponse.json({
      ok: true,
      signedIn: staySignedIn,
      role: account.role,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not confirm that email";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
