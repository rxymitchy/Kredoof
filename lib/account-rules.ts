export const EMAIL_PATTERN =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const NAME_PATTERN = /^[\p{L}][\p{L} .'-]{0,39}$/u;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim().toLowerCase());
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
  password: string;
}): string | null {
  return (
    nameHint(input.firstName, "first name") ??
    nameHint(input.lastName, "last name") ??
    emailHint(input.email) ??
    passwordHint(input.password)
  );
}

export function validateLogin(input: {
  email: string;
  password: string;
}): string | null {
  if (!isValidEmail(input.email)) {
    return "Enter the email you signed up with";
  }
  if (!input.password) {
    return "Enter your password";
  }
  return null;
}

export function displayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").slice(0, 80);
}
