import { NextResponse } from "next/server";
import { sendRegistrationEmail } from "@/lib/mail";
import { DuplicateEmailError, registerUser } from "@/lib/persist";
import { apiOrigin, appOrigin } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = body.email ?? "";
  const password = body.password ?? "";
  try {
    const data = await registerUser({ email, password, firstName, lastName });
    await fetch(`${apiOrigin()}/api/accounts/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        password,
        name: data.name,
        first_name: data.firstName,
        last_name: data.lastName,
      }),
      signal: AbortSignal.timeout(2500),
    }).catch(() => null);
    const loginUrl = `${appOrigin(request)}/api/auth/confirm?token=${data.verifyToken}`;
    const emailSent = await sendRegistrationEmail({
      to: data.email,
      name: data.name,
      loginUrl,
    }).catch(() => false);
    return NextResponse.json({
      email: data.email,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      emailSent,
    });
  } catch (error) {
    const duplicate = error instanceof DuplicateEmailError;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not create account",
        field: duplicate ? "email" : undefined,
      },
      { status: duplicate ? 409 : 400 }
    );
  }
}
