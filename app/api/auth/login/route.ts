import { NextResponse } from "next/server";
import { LoginError, loginUser } from "@/lib/persist";
import { apiOrigin, getSession } from "@/lib/session";

type Account = {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  wallet?: string | null;
};

function messageFromBody(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const record = body as { detail?: unknown; error?: unknown };
  if (typeof record.detail === "string") return record.detail;
  if (typeof record.error === "string") return record.error;
  return "";
}

function classify(message: string): LoginError {
  const text = message.toLowerCase();
  if (text.includes("password")) {
    return new LoginError("password", "Wrong password");
  }
  return new LoginError(
    "email",
    "No account for that email. Sign up first."
  );
}

async function loginViaPython(
  email: string,
  password: string
): Promise<Account | LoginError | null> {
  try {
    const res = await fetch(`${apiOrigin()}/api/accounts/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body as Account;
    return classify(messageFromBody(body));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "Email and password required", field: "email" },
      { status: 400 }
    );
  }
  try {
    let data: Account;
    try {
      data = await loginUser(body.email, body.password);
    } catch (error) {
      const persistError =
        error instanceof LoginError
          ? error
          : classify(error instanceof Error ? error.message : "");
      const fallback = await loginViaPython(body.email, body.password);
      if (fallback && !(fallback instanceof LoginError)) {
        data = fallback;
      } else if (persistError.field === "password") {
        throw persistError;
      } else if (fallback instanceof LoginError) {
        throw fallback;
      } else {
        throw persistError;
      }
    }
    const session = await getSession();
    session.email = data.email;
    session.name = data.name;
    session.wallet = data.wallet ?? session.wallet;
    session.signedIn = true;
    await session.save();
    return NextResponse.json(data);
  } catch (error) {
    const field = error instanceof LoginError ? error.field : "email";
    const message =
      error instanceof Error
        ? error.message
        : "No account for that email. Sign up first.";
    return NextResponse.json({ error: message, field }, { status: 401 });
  }
}
