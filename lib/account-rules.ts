export const EMAIL_PATTERN =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const NAME_PATTERN = /^[\p{L}][\p{L} .'-]{0,39}$/u;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim().toLowerCase());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Digits only, Kenyan 07xxxxxxxx becomes 2547xxxxxxxx. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `254${digits.slice(1)}`;
  }
  if (digits.startsWith("2540") && digits.length === 13) {
    digits = `254${digits.slice(4)}`;
  }
  return digits;
}

export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  return digits.length >= 10 && digits.length <= 15;
}

export function looksLikeEmail(raw: string): boolean {
  return raw.trim().includes("@");
}

export function isValidName(value: string): boolean {
  return NAME_PATTERN.test(value.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

export function emailHint(email: string): string | null {
  const value = email.trim();
  if (!value) return "Enter your email";
  if (!isValidEmail(value)) {
    return "Use an address like you@gmail.com";
  }
  return null;
}

export function phoneHint(phone: string): string | null {
  const value = phone.trim();
  if (!value) return "Enter your phone number";
  if (!isValidPhone(value)) {
    return "Use a mobile number like 0712 345 678";
  }
  return null;
}

export function identifierHint(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter your email or phone number";
  if (looksLikeEmail(trimmed)) return emailHint(trimmed);
  return phoneHint(trimmed);
}

export function passwordHint(password: string): string | null {
  if (!password) return "Enter a password";
  if (password.length < 8) {
    return "Use at least 8 characters";
  }
  return null;
}

export function nameHint(value: string, label: string): string | null {
  if (!value.trim()) return `Enter your ${label}`;
  if (!isValidName(value)) {
    return `Enter a valid ${label}`;
  }
  return null;
}

export function validateSignup(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}): string | null {
  return (
    nameHint(input.firstName, "first name") ??
    nameHint(input.lastName, "last name") ??
    emailHint(input.email) ??
    phoneHint(input.phone) ??
    passwordHint(input.password)
  );
}

export function validateLogin(input: {
  identifier: string;
  password: string;
}): string | null {
  return identifierHint(input.identifier) ?? (input.password ? null : "Enter your password");
}

export function displayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").slice(0, 80);
}
