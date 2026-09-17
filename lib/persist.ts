import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { get, put } from "@vercel/blob";
import {
  displayName,
  identifierHint,
  looksLikeEmail,
  normalizeEmail,
  normalizePhone,
  passwordHint,
  validateLogin,
  validateSignup,
} from "@/lib/account-rules";
import { isOpenLoanStatus } from "@/lib/loan-terms";

export type StoredUser = {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  name: string;
  wallet?: string | null;
  emailVerified?: boolean;
  verifyTokenHash?: string | null;
  verifyTokenExpires?: number | null;
  resetTokenHash?: string | null;
  resetTokenExpires?: number | null;
  createdAt: number;
  lastScore?: number | null;
  deletedAt?: number | null;
};

export type StoredLoan = {
  id: string;
  email?: string | null;
  wallet: string;
  amount_usdc: number;
  net_usdc?: number;
  origination_usdc?: number;
  app_fee_usdc?: number;
  repay_usdc?: number;
  term_days?: number;
  daily_rate?: number;
  due_at?: number;
  status: string;
  disburse_tx?: string | null;
  repay_tx?: string | null;
  created_at: number;
};

const STORE = "kredoof-v2";
const LOANS_PATH = `${STORE}/loans.json`;
const VERIFY_PREFIX = `${STORE}/verify/`;
const RESET_PREFIX = `${STORE}/reset/`;

function hashPassword(password: string): string {
  return pbkdf2Sync(password, "kredoof-v1", 120_000, 32, "sha256").toString(
    "hex"
  );
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newId(): string {
  return randomBytes(16).toString("hex");
}

function userPath(id: string): string {
  return `${STORE}/users/${id}.json`;
}

function emailIndexPath(email: string): string {
  return `${STORE}/email/${hashToken(normalizeEmail(email))}.json`;
}

function phoneIndexPath(phone: string): string {
  return `${STORE}/phone/${hashToken(normalizePhone(phone))}.json`;
}

function verifyObjectPath(tokenHash: string): string {
  return `${VERIFY_PREFIX}${tokenHash}.json`;
}

function resetObjectPath(tokenHash: string): string {
  return `${RESET_PREFIX}${tokenHash}.json`;
}

function newToken(hours: number): { token: string; hash: string; expires: number } {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    hash: hashToken(token),
    expires: Date.now() + hours * 60 * 60 * 1000,
  };
}

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export class LoginError extends Error {
  readonly field: "email" | "password" | "phone";
  constructor(field: "email" | "password" | "phone", message: string) {
    super(message);
    this.name = "LoginError";
    this.field = field;
  }
}

export class DuplicateAccountError extends Error {
  readonly field: "email" | "phone";
  constructor(field: "email" | "phone") {
    super(
      field === "phone"
        ? "An account with that phone number already exists"
        : "An account with that email already exists"
    );
    this.name = "DuplicateAccountError";
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
    id: raw.id,
    email: normalizeEmail(raw.email),
    phone: raw.phone ? normalizePhone(raw.phone) : "",
    firstName,
    lastName,
    name: raw.name || displayName(firstName, lastName),
  };
}

function isAlreadyExistsError(error: unknown): boolean {
  if (error instanceof DuplicateAccountError) return true;
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
    try {
      const result = await get(pathname, {
        access: "private",
        useCache: false,
        abortSignal: AbortSignal.timeout(8000),
      });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
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

async function getUserById(id: string): Promise<StoredUser | null> {
  if (!id) return null;
  const stored = await readObject<StoredUser>(userPath(id));
  return stored ? normalizeUser(stored) : null;
}

export async function getUserByEmail(
  emailRaw: string
): Promise<StoredUser | null> {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  const index = await readObject<{ id?: string }>(emailIndexPath(email));
  if (!index?.id) return null;
  const user = await getUserById(index.id);
  if (!user || user.deletedAt) return null;
  return user;
}

export async function getUserByPhone(
  phoneRaw: string
): Promise<StoredUser | null> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return null;
  const index = await readObject<{ id?: string }>(phoneIndexPath(phone));
  if (!index?.id) return null;
  const user = await getUserById(index.id);
  if (!user || user.deletedAt) return null;
  return user;
}

export async function getUserByIdentifier(
  raw: string
): Promise<StoredUser | null> {
  const value = raw.trim();
  if (!value) return null;
  if (looksLikeEmail(value)) return getUserByEmail(value);
  return getUserByPhone(value);
}

async function saveUser(user: StoredUser, mode: "create" | "update") {
  await writeObject(userPath(user.id), user, mode);
}

export async function registerUser(input: {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{
  email: string;
  phone: string;
  name: string;
  firstName: string;
  lastName: string;
  verifyToken: string;
}> {
  const error = validateSignup(input);
  if (error) throw new Error(error);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const name = displayName(firstName, lastName);
  if (await getUserByEmail(email)) throw new DuplicateAccountError("email");
  if (await getUserByPhone(phone)) throw new DuplicateAccountError("phone");
  const id = newId();
  const verify = newToken(24);
  const user: StoredUser = {
    id,
    email,
    phone,
    passwordHash: hashPassword(input.password),
    firstName,
    lastName,
    name,
    wallet: null,
    emailVerified: false,
    verifyTokenHash: verify.hash,
    verifyTokenExpires: verify.expires,
    resetTokenHash: null,
    resetTokenExpires: null,
    createdAt: Date.now(),
  };
  try {
    await writeObject(emailIndexPath(email), { id }, "create");
  } catch (error) {
    if (isAlreadyExistsError(error)) throw new DuplicateAccountError("email");
    throw error;
  }
  try {
    await writeObject(phoneIndexPath(phone), { id }, "create");
  } catch (error) {
    if (isAlreadyExistsError(error)) throw new DuplicateAccountError("phone");
    throw error;
  }
  await saveUser(user, "update");
  await writeObject(
    verifyObjectPath(verify.hash),
    { id, email, expires: verify.expires },
    "update"
  ).catch(() => null);
  return { email, phone, name, firstName, lastName, verifyToken: verify.token };
}

export async function loginUser(
  identifierRaw: string,
  password: string
): Promise<{
  email: string;
  phone: string;
  name: string;
  firstName: string;
  lastName: string;
  wallet?: string | null;
}> {
  const error = validateLogin({ identifier: identifierRaw, password });
  if (error) {
    throw new LoginError(looksLikeEmail(identifierRaw) ? "email" : "phone", error);
  }
  const user = await getUserByIdentifier(identifierRaw);
  if (!user) {
    throw new LoginError(
      looksLikeEmail(identifierRaw) ? "email" : "phone",
      looksLikeEmail(identifierRaw)
        ? "No account for that email. Sign up first."
        : "No account for that phone number. Sign up first."
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
    phone: user.phone,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    wallet: user.wallet,
  };
}

export async function confirmEmailToken(tokenRaw: string): Promise<{
  email: string;
  phone: string;
  name: string;
  firstName: string;
  lastName: string;
}> {
  const token = tokenRaw.trim();
  if (!token) throw new Error("Missing confirmation link");
  const hash = hashToken(token);
  const lookup = await readObject<{
    id?: string;
    email?: string;
    expires?: number;
  }>(verifyObjectPath(hash));
  const user = lookup?.id
    ? await getUserById(lookup.id)
    : lookup?.email
      ? await getUserByEmail(lookup.email)
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
    phone: user.phone,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function requestPasswordReset(identifierRaw: string): Promise<{
  email: string;
  name: string;
  resetToken: string;
} | null> {
  if (identifierHint(identifierRaw)) return null;
  const user = await getUserByIdentifier(identifierRaw);
  if (!user) return null;
  const reset = newToken(1);
  user.resetTokenHash = reset.hash;
  user.resetTokenExpires = reset.expires;
  await saveUser(user, "update");
  await writeObject(
    resetObjectPath(reset.hash),
    { id: user.id, email: user.email, expires: reset.expires },
    "update"
  ).catch(() => null);
  return { email: user.email, name: user.name, resetToken: reset.token };
}

export async function resetPasswordWithToken(
  tokenRaw: string,
  password: string
): Promise<{ email: string; name: string }> {
  const passwordError = passwordHint(password);
  if (passwordError) throw new Error(passwordError);
  const token = tokenRaw.trim();
  if (!token) throw new Error("Missing reset link");
  const hash = hashToken(token);
  const lookup = await readObject<{
    id?: string;
    email?: string;
    expires?: number;
  }>(resetObjectPath(hash));
  const user = lookup?.id
    ? await getUserById(lookup.id)
    : lookup?.email
      ? await getUserByEmail(lookup.email)
      : null;
  if (!user || user.resetTokenHash !== hash) {
    throw new Error("This reset link is invalid");
  }
  const expires = lookup?.expires ?? user.resetTokenExpires ?? 0;
  if (expires < Date.now()) {
    throw new Error("This reset link has expired. Request a new one.");
  }
  user.passwordHash = hashPassword(password);
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  await saveUser(user, "update");
  return { email: user.email, name: user.name };
}

export async function listLoans(): Promise<StoredLoan[]> {
  return readJson<StoredLoan[]>(LOANS_PATH, []);
}

export async function loansForAccount(input: {
  email?: string | null;
  wallet?: string | null;
}): Promise<StoredLoan[]> {
  const email = input.email ? normalizeEmail(input.email) : "";
  const wallet = input.wallet?.toLowerCase() ?? "";
  const loans = await listLoans();
  return loans.filter((loan) => {
    const matchEmail = email && loan.email && normalizeEmail(loan.email) === email;
    const matchWallet = wallet && loan.wallet.toLowerCase() === wallet;
    return Boolean(matchEmail || matchWallet);
  });
}

export async function hasOpenLoan(input: {
  email?: string | null;
  wallet?: string | null;
}): Promise<boolean> {
  const loans = await loansForAccount(input);
  return loans.some((loan) => isOpenLoanStatus(loan.status));
}

export async function hasRepaidLoan(input: {
  email?: string | null;
  wallet?: string | null;
}): Promise<boolean> {
  const loans = await loansForAccount(input);
  return loans.some((loan) => (loan.status ?? "").toLowerCase() === "repaid");
}

export async function setUserLastScore(emailRaw: string, score: number) {
  const user = await getUserByEmail(emailRaw);
  if (!user) return null;
  user.lastScore = score;
  await saveUser(user, "update");
  return user;
}

export async function deleteUserAccount(emailRaw: string): Promise<void> {
  const user = await getUserByEmail(emailRaw);
  if (!user) throw new Error("Unknown account");
  if (await hasOpenLoan({ email: user.email, wallet: user.wallet })) {
    throw new Error("Pay your loan first, then you can delete this account.");
  }
  user.deletedAt = Date.now();
  user.wallet = null;
  user.passwordHash = hashPassword(randomBytes(24).toString("hex"));
  await saveUser(user, "update");
  await writeObject(emailIndexPath(user.email), { id: "" }, "update").catch(
    () => null
  );
  if (user.phone) {
    await writeObject(phoneIndexPath(user.phone), { id: "" }, "update").catch(
      () => null
    );
  }
}

export async function bindUserWallet(emailRaw: string, wallet: string) {
  const user = await getUserByEmail(emailRaw);
  if (!user) throw new Error("Unknown account");
  const next = wallet.toLowerCase();
  if (
    user.wallet &&
    user.wallet !== next &&
    (await hasOpenLoan({ email: user.email, wallet: user.wallet }))
  ) {
    throw new Error("Pay your loan first, then you can change wallets.");
  }
  user.wallet = next;
  await saveUser(user, "update");
  return {
    email: user.email,
    phone: user.phone,
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
