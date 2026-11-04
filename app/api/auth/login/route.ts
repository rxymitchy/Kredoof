import { parseAccountRole } from "@/lib/account-role";
import { NextResponse } from "next/server";
import { LoginError, loginUser } from "@/lib/persist";
import { clientKey, retryAfterSeconds, tooSoon } from "@/lib/rate-limit";
import { beginTotpChallenge, establishSession } from "@/lib/session";

export async function POST(request: Request) {
  const wait = await tooSoon(clientKey(request, "login"), 12, 15 * 60 * 1000);
  if (wait > 0) {
    return NextResponse.json(
      { error: "Too many sign-in tries. Wait a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(wait)) },
      }
    );
  }
  const body = (await request.json()) as {
    identifier?: string;
    email?: string;
    password?: string;
  };
  const identifier = body.identifier ?? body.email ?? "";
  if (!identifier || !body.password) {
    return NextResponse.json(
      { error: "Email or phone and password required" },
      { status: 400 }
    );
  }
  try {
    const data = await loginUser(identifier, body.password);
    if (data.totpEnabled) {
      await beginTotpChallenge(data.email);
      return NextResponse.json({ totpRequired: true });
    }
    await establishSession({
      email: data.email,
      phone: data.phone,
      name: data.name,
      wallet: data.wallet,
      role: parseAccountRole(data.role),
    });
    return NextResponse.json({ ...data, totpSuggested: true });
  } catch (error) {
    const message =
      error instanceof LoginError
        ? error.message
        : "Wrong email, phone, or password.";
    const field =
      error instanceof LoginError && error.field === "email"
        ? "email"
        : undefined;
    return NextResponse.json(
      field ? { error: message, field } : { error: message },
      { status: 401 }
    );
  }
}
