import { createHash, pbkdf2Sync, timingSafeEqual } from "crypto";
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

const USERS_PATH = "kredoof-users.json";
const LOANS_PATH = "kredoof-loans.json";

function hashPassword(password: string): string {
  return pbkdf2Sync(password, "kredoof-v1", 120_000, 32, "sha256").toString(
    "hex"
  );
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
    firstName,
    lastName,
    name: raw.name || displayName(firstName, lastName),
  };
}

async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  if (blobEnabled()) {
    const { blobs } = await list({ prefix: pathname, limit: 20 });
    const hit = blobs.find((b) => b.pathname === pathname) ?? blobs[0];
    if (hit?.url) {
      const res = await fetch(hit.url);
      if (res.ok) return (await res.json()) as T;
    }
  }
  try {
    const buf = await readFile(localFile(pathname), "utf8");
    return JSON.parse(buf) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(pathname: string, data: unknown): Promise<void> {
  const body = JSON.stringify(data);
  if (blobEnabled()) {
    await put(pathname, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }
  const file = localFile(pathname);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
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
}> {
  const error = validateSignup(input);
  if (error) throw new Error(error);
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const name = displayName(firstName, lastName);
  const users = (await readJson<StoredUser[]>(USERS_PATH, [])).map(normalizeUser);
  if (users.some((u) => u.email === email)) {
    throw new Error("An account with that email already exists");
  }
  users.push({
    email,
    passwordHash: hashPassword(input.password),
    firstName,
    lastName,
    name,
    wallet: null,
    createdAt: Date.now(),
  });
  await writeJson(USERS_PATH, users);
  return { email, name, firstName, lastName };
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
  const email = emailRaw.trim().toLowerCase();
  const users = (await readJson<StoredUser[]>(USERS_PATH, [])).map(normalizeUser);
  const user = users.find((u) => u.email === email);
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

export async function bindUserWallet(emailRaw: string, wallet: string) {
  const email = emailRaw.trim().toLowerCase();
  const users = (await readJson<StoredUser[]>(USERS_PATH, [])).map(normalizeUser);
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("Unknown account");
  user.wallet = wallet.toLowerCase();
  await writeJson(USERS_PATH, users);
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
  loans.unshift(loan);
  await writeJson(LOANS_PATH, loans);
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
