import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { list, put } from "@vercel/blob";
import {
  displayName,
  validateLogin,
  validateSignup,
} from "@/lib/account-rules";

export type StoredUser = {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  name: string;
  wallet?: string | null;
  emailVerified?: boolean;
  verifyTokenHash?: string | null;
  verifyTokenExpires?: number | null;
  createdAt: number;
};

export type StoredLoan = {
  id: string;
  email?: string | null;
  wallet: string;
  amount_usdc: number;
  status: string;
  disburse_tx?: string | null;
  repay_tx?: string | null;
  created_at: number;
};

const LEGACY_USERS_PATH = "kredoof-users.json";
const LOANS_PATH = "kredoof-loans.json";
const USER_PREFIX = "kredoof-accounts/";
const VERIFY_PREFIX = "kredoof-verify/";

function hashPassword(password: string): string {
  return pbkdf2Sync(password, "kredoof-v1", 120_000, 32, "sha256").toString(
    "hex"
  );
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function userObjectPath(email: string): string {
  return `${USER_PREFIX}${hashToken(normalizeEmail(email))}.json`;
}

function verifyObjectPath(tokenHash: string): string {
  return `${VERIFY_PREFIX}${tokenHash}.json`;
}

function newVerifyToken(): { token: string; hash: string; expires: number } {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    hash: hashToken(token),
    expires: Date.now() + 24 * 60 * 60 * 1000,
  };
}

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export class LoginError extends Error {
  readonly field: "email" | "password";
  constructor(field: "email" | "password", message: string) {
    super(message);
    this.name = "LoginError";
    this.field = field;
  }
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with that email already exists");
    this.name = "DuplicateEmailError";
  }
}

function localFile(pathname: string): string {
  const dir = process.env.VERCEL
    ? "/tmp"
    : path.join(process.cwd(), "data");
  return path.join(dir, pathname);
}

function normalizeUser(raw: StoredUser): StoredUser {
  const firstName = raw.firstName?.trim() || raw.name?.split(" ")[0] || "";
  const lastName =
    raw.lastName?.trim() || raw.name?.split(" ").slice(1).join(" ") || "";
  return {
    ...raw,
    email: normalizeEmail(raw.email),
    firstName,
    lastName,
    name: raw.name || displayName(firstName, lastName),
  };
}

function isAlreadyExistsError(error: unknown): boolean {
  if (error instanceof DuplicateEmailError) return true;
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (code === "EEXIST") return true;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("already exists") ||
    message.includes("already been taken") ||
    message.includes("blob already exists")
  );
}

async function readObject<T>(pathname: string): Promise<T | null> {
  if (blobEnabled()) {
    const { blobs } = await list({
      prefix: pathname,
      limit: 20,
      abortSignal: AbortSignal.timeout(8000),
    });
    const hit = blobs.find((b) => b.pathname === pathname) ?? blobs[0];
    if (hit?.url) {
      const res = await fetch(hit.url, { cache: "no-store" });
      if (res.ok) return (await res.json()) as T;
    }
    return null;
  }
  try {
    const buf = await readFile(localFile(pathname), "utf8");
    return JSON.parse(buf) as T;
  } catch {
    return null;
  }
}

async function writeObject(
  pathname: string,
  data: unknown,
  mode: "create" | "update"
): Promise<void> {
  const body = JSON.stringify(data);
  if (blobEnabled()) {
    await put(pathname, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: mode === "update",
      cacheControlMaxAge: 60,
      contentType: "application/json",
      abortSignal: AbortSignal.timeout(8000),
    });
    return;
  }
  const file = localFile(pathname);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, {
    encoding: "utf8",
    flag: mode === "create" ? "wx" : "w",
  });
}

async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  const value = await readObject<T>(pathname);
  return value ?? fallback;
}

async function writeJson(pathname: string, data: unknown): Promise<void> {
  await writeObject(pathname, data, "update");
}

async function readLegacyUser(email: string): Promise<StoredUser | null> {
  const users = (await readJson<StoredUser[]>(LEGACY_USERS_PATH, [])).map(
    normalizeUser
  );
  return users.find((u) => u.email === email) ?? null;
}

export async function getUserByEmail(
  emailRaw: string
): Promise<StoredUser | null> {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  const stored = await readObject<StoredUser>(userObjectPath(email));
  if (stored) return normalizeUser(stored);
  const legacy = await readLegacyUser(email);
  if (!legacy) return null;
  await writeObject(userObjectPath(email), legacy, "update").catch(() => null);
  return legacy;
}

async function saveUser(user: StoredUser, mode: "create" | "update") {
  try {
    await writeObject(userObjectPath(user.email), user, mode);
  } catch (error) {
    if (mode === "create" && isAlreadyExistsError(error)) {
      throw new DuplicateEmailError();
    }
    throw error;
  }
}

export async function registerUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  verifyToken: string;
}> {
  const error = validateSignup(input);
  if (error) throw new Error(error);
  const email = normalizeEmail(input.email);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const name = displayName(firstName, lastName);
  if (await getUserByEmail(email)) {
    throw new DuplicateEmailError();
  }
  const verify = newVerifyToken();
  const user: StoredUser = {
    email,
    passwordHash: hashPassword(input.password),
    firstName,
    lastName,
    name,
    wallet: null,
    emailVerified: false,
    verifyTokenHash: verify.hash,
    verifyTokenExpires: verify.expires,
    createdAt: Date.now(),
  };
  await saveUser(user, "create");
  await writeObject(
    verifyObjectPath(verify.hash),
    { email, expires: verify.expires },
    "update"
  ).catch(() => null);
  return { email, name, firstName, lastName, verifyToken: verify.token };
}

export async function loginUser(
  emailRaw: string,
  password: string
): Promise<{
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  wallet?: string | null;
}> {
  const error = validateLogin({ email: emailRaw, password });
  if (error) throw new LoginError("email", error);
  const email = normalizeEmail(emailRaw);
  const user = await getUserByEmail(email);
  if (!user) {
    throw new LoginError(
      "email",
      "No account for that email. Sign up first."
    );
  }
  const actual = hashPassword(password);
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new LoginError("password", "Wrong password");
  }
  return {
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    wallet: user.wallet,
  };
}

export async function confirmEmailToken(tokenRaw: string): Promise<{
  email: string;
  name: string;
  firstName: string;
  lastName: string;
}> {
  const token = tokenRaw.trim();
  if (!token) throw new Error("Missing confirmation link");
  const hash = hashToken(token);
  const lookup = await readObject<{ email?: string; expires?: number }>(
    verifyObjectPath(hash)
  );
  const email = lookup?.email ? normalizeEmail(lookup.email) : "";
  const user = email
    ? await getUserByEmail(email)
    : null;
  if (!user || user.verifyTokenHash !== hash) {
    throw new Error("This confirmation link is invalid");
  }
  const expires = lookup?.expires ?? user.verifyTokenExpires ?? 0;
  if (expires < Date.now()) {
    throw new Error(
      "This confirmation link has expired. Sign in with your password."
    );
  }
  user.emailVerified = true;
  user.verifyTokenHash = null;
  user.verifyTokenExpires = null;
  await saveUser(user, "update");
  return {
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function bindUserWallet(emailRaw: string, wallet: string) {
  const email = normalizeEmail(emailRaw);
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Unknown account");
  user.wallet = wallet.toLowerCase();
  await saveUser(user, "update");
  return {
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    wallet: user.wallet,
  };
}

export async function recordLoan(loan: StoredLoan): Promise<StoredLoan> {
  const loans = await readJson<StoredLoan[]>(LOANS_PATH, []);
  const next = loans.filter((item) => item.id !== loan.id);
  next.unshift(loan);
  await writeJson(LOANS_PATH, next);
  return loan;
}

export async function updateLoan(
  id: string,
  patch: Partial<StoredLoan>
): Promise<StoredLoan> {
  const loans = await readJson<StoredLoan[]>(LOANS_PATH, []);
  const loan = loans.find((l) => l.id === id);
  if (!loan) throw new Error("Unknown loan");
  Object.assign(loan, patch);
  await writeJson(LOANS_PATH, loans);
  return loan;
}

export function newLoanId(): string {
  return createHash("sha256")
    .update(`${Date.now()}-${Math.random()}`)
    .digest("hex")
    .slice(0, 16);
}
