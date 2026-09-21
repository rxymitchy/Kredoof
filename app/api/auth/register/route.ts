import { parseAccountRole } from "@/lib/account-role";
import { NextResponse } from "next/server";
import { sendRegistrationEmail } from "@/lib/mail";
import { DuplicateAccountError, registerUser } from "@/lib/persist";
import { apiOrigin, appOrigin } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    phone?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = body.email ?? "";
  const phone = body.phone ?? "";
  const password = body.password ?? "";
  const role = parseAccountRole(body.role);
  try {
    const data = await registerUser({
      email,
      phone,
      password,
      firstName,
      lastName,
      role,
    });
    await fetch(`${apiOrigin()}/api/accounts/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        phone: data.phone,
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
      phone: data.phone,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      emailSent,
    });
  } catch (error) {
    const duplicate = error instanceof DuplicateAccountError;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not create account",
        field: duplicate ? error.field : undefined,
      },
      { status: duplicate ? 409 : 400 }
    );
  }
}
