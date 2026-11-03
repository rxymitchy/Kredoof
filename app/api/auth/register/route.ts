import { parseAccountRole } from "@/lib/account-role";
import {
  displayName,
  normalizeEmail,
  normalizePhone,
} from "@/lib/account-rules";
import { NextResponse } from "next/server";
import { sendRegistrationEmail } from "@/lib/mail";
import { DuplicateAccountError, registerUser } from "@/lib/persist";
import { clientKey, retryAfterSeconds, tooSoon } from "@/lib/rate-limit";
import { apiOrigin, appOrigin } from "@/lib/session";

function signupOk(input: {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: ReturnType<typeof parseAccountRole>;
  emailSent: boolean;
}) {
  return {
    email: input.email,
    phone: input.phone,
    name: displayName(input.firstName, input.lastName),
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    emailSent: input.emailSent,
  };
}

export async function POST(request: Request) {
  const wait = await tooSoon(clientKey(request, "register"), 8, 30 * 60 * 1000);
  if (wait > 0) {
    return NextResponse.json(
      { error: "Too many sign-ups from here. Wait a bit." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(wait)) },
      }
    );
  }
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
        name: data.name,
        first_name: data.firstName,
        last_name: data.lastName,
      }),
      signal: AbortSignal.timeout(2500),
    }).catch(() => null);
    const loginUrl = `${appOrigin(request)}/api/auth/confirm?token=${data.verifyToken}`;
    await sendRegistrationEmail({
      to: data.email,
      name: data.name,
      loginUrl,
    }).catch(() => false);
    return NextResponse.json(
      signupOk({
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        emailSent: true,
      })
    );
  } catch (error) {
    if (error instanceof DuplicateAccountError) {
      return NextResponse.json(
        signupOk({
          email: normalizeEmail(email),
          phone: normalizePhone(phone),
          firstName,
          lastName,
          role,
          emailSent: true,
        })
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create account",
      },
      { status: 400 }
    );
  }
}
