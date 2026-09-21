import { parseAccountRole } from "@/lib/account-role";
import { NextResponse } from "next/server";
import { LoginError, loginUser } from "@/lib/persist";
import { apiOrigin, establishSession } from "@/lib/session";

type Account = {
  email: string;
  phone?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  wallet?: string | null;
  role?: string;
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
  if (text.includes("phone")) {
    return new LoginError(
      "phone",
      "No account for that phone number. Sign up first."
    );
  }
  return new LoginError(
    "email",
    "No account for that email. Sign up first."
  );
}

async function loginViaPython(
  identifier: string,
  password: string
): Promise<Account | LoginError | null> {
  try {
    const res = await fetch(`${apiOrigin()}/api/accounts/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, email: identifier, password }),
      signal: AbortSignal.timeout(2500),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body as Account;
    return classify(messageFromBody(body));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    identifier?: string;
    email?: string;
    password?: string;
  };
  const identifier = body.identifier ?? body.email ?? "";
  if (!identifier || !body.password) {
    return NextResponse.json(
      { error: "Email or phone and password required", field: "email" },
      { status: 400 }
    );
  }
  try {
    let data: Account;
    try {
      data = await loginUser(identifier, body.password);
    } catch (error) {
      const persistError =
        error instanceof LoginError
          ? error
          : classify(error instanceof Error ? error.message : "");
      const fallback = await loginViaPython(identifier, body.password);
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
    await establishSession({
      email: data.email,
      phone: data.phone,
      name: data.name,
      wallet: data.wallet,
      role: parseAccountRole(data.role),
    });
    return NextResponse.json({ ...data, role: parseAccountRole(data.role) });
  } catch (error) {
    const field = error instanceof LoginError ? error.field : "email";
    const message =
      error instanceof Error
        ? error.message
        : "No account for that email or phone. Sign up first.";
    return NextResponse.json({ error: message, field }, { status: 401 });
  }
}
