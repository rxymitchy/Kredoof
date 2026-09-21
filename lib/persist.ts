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
import type { MarketplaceFile } from "@/lib/marketplace-file";
import { parseAccountRole, type AccountRole } from "@/lib/account-role";
import { dbEnabled, ensureSchema, getSql } from "@/lib/db";
import { isOpenLoanStatus, LEAD_FEE_KES } from "@/lib/loan-terms";

// Accounts, loans, and leads. Postgres when DATABASE_URL is set; otherwise
// Vercel Blob, or local JSON under data/ when Blob is not linked.

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
  role?: AccountRole;
  googleId?: string | null;
};

export type StoredLoan = {
  id: string;
  email?: string | null;
  wallet: string;
  amount_usdc: number;
  net_usdc?: number;
  origination_usdc?: number;
  app_fee_usdc?: number;
  lead_id?: string | null;
  repay_usdc?: number;
  term_days?: number;
  daily_rate?: number;
  due_at?: number;
  status: string;
  disburse_tx?: string | null;
  repay_tx?: string | null;
  created_at: number;
};

export type StoredLead = {
  id: string;
  email?: string | null;
  wallet: string;
  score?: number;
  limit_kes?: number;
  fee_kes: number;
  payer: "lender";
  status: "offered" | "claimed" | "funded";
  lender?: string;
  loan_id?: string | null;
  created_at: number;
};

/** Blob / local JSON folder. Do not mix with older kredoof-v1 files. */
const STORE = "kredoof-v2";
const LOANS_PATH = `${STORE}/loans.json`;
const LEADS_PATH = `${STORE}/leads.json`;
const VERIFY_PREFIX = `${STORE}/verify/`;
const RESET_PREFIX = `${STORE}/reset/`;

/** Slow hash so a leaked table is harder to brute-force. Salt is fixed (kredoof-v1). */
function hashPassword(password: string): string {
  return pbkdf2Sync(password, "kredoof-v1", 120_000, 32, "sha256").toString(
    "hex"
  );
}

/** Store hashes of email-confirm / reset tokens, not the raw link. */
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
  // On Vercel without Postgres/Blob, /tmp is wiped on cold start — laptop uses data/.
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
    role: parseAccountRole(raw.role),
    googleId: raw.googleId ?? null,
  };
}

function isAlreadyExistsError(error: unknown): boolean {
  if (error instanceof DuplicateAccountError) return true;
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (code === "EEXIST" || code === "23505") return true; // file exists, or Postgres unique violation
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("already exists") ||
    message.includes("already been taken") ||
    message.includes("duplicate key") ||
    message.includes("blob already exists")
  );
}

function duplicateField(error: unknown): "email" | "phone" {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("phone")) return "phone";
  return "email";
}

type UserRow = {
  id: string;
  email: string;
  phone: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  name: string;
  wallet: string | null;
  email_verified: boolean;
  verify_token_hash: string | null;
  verify_token_expires: string | number | null;
  reset_token_hash: string | null;
  reset_token_expires: string | number | null;
  created_at: string | number;
  last_score: number | null;
  deleted_at: string | number | null;
  role: string | null;
  google_id: string | null;
};

function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  return Number(value);
}

function userFromRow(row: UserRow): StoredUser {
  return normalizeUser({
    id: row.id,
    email: row.email,
    phone: row.phone ?? "",
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    name: row.name,
    wallet: row.wallet,
    emailVerified: Boolean(row.email_verified),
    verifyTokenHash: row.verify_token_hash,
    verifyTokenExpires: num(row.verify_token_expires),
    resetTokenHash: row.reset_token_hash,
    resetTokenExpires: num(row.reset_token_expires),
    createdAt: Number(row.created_at),
    lastScore: row.last_score,
    deletedAt: num(row.deleted_at),
    role: parseAccountRole(row.role),
    googleId: row.google_id,
  });
}

function loanFromRow(row: Record<string, unknown>): StoredLoan {
  return {
    id: String(row.id),
    email: (row.email as string | null) ?? null,
    wallet: String(row.wallet),
    amount_usdc: Number(row.amount_usdc),
    net_usdc: row.net_usdc == null ? undefined : Number(row.net_usdc),
    origination_usdc:
      row.origination_usdc == null ? undefined : Number(row.origination_usdc),
    app_fee_usdc: row.app_fee_usdc == null ? undefined : Number(row.app_fee_usdc),
    lead_id: (row.lead_id as string | null) ?? null,
    repay_usdc: row.repay_usdc == null ? undefined : Number(row.repay_usdc),
    term_days: row.term_days == null ? undefined : Number(row.term_days),
    daily_rate: row.daily_rate == null ? undefined : Number(row.daily_rate),
    due_at: row.due_at == null ? undefined : Number(row.due_at),
    status: String(row.status),
    disburse_tx: (row.disburse_tx as string | null) ?? null,
    repay_tx: (row.repay_tx as string | null) ?? null,
    created_at: Number(row.created_at),
  };
}

function leadFromRow(row: Record<string, unknown>): StoredLead {
  return {
    id: String(row.id),
    email: (row.email as string | null) ?? null,
    wallet: String(row.wallet),
    score: row.score == null ? undefined : Number(row.score),
    limit_kes: row.limit_kes == null ? undefined : Number(row.limit_kes),
    fee_kes: Number(row.fee_kes),
    payer: "lender",
    status:
      row.status === "funded"
        ? "funded"
        : row.status === "claimed"
          ? "claimed"
          : "offered",
    lender: (row.lender as string | undefined) ?? undefined,
    loan_id: (row.loan_id as string | null) ?? null,
    created_at: Number(row.created_at),
  };
}

/** Prefer Postgres; on first empty DB, copy leftover Blob users once. */
async function usingDb(): Promise<boolean> {
  if (!dbEnabled()) return false;
  await ensureSchema();
  await importBlobIfEmpty();
  return true;
}

async function importBlobIfEmpty(): Promise<void> {
  const sql = getSql();
  const rows = (await sql`SELECT count(*)::int AS n FROM users`) as { n: number }[];
  if ((rows[0]?.n ?? 0) > 0) return; // already migrated or new signups exist
  const users = await listBlobUsers();
  for (const user of users) {
    try {
      await insertUserRow(user);
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
    }
  }
  const loans = await readJson<StoredLoan[]>(LOANS_PATH, []);
  for (const loan of loans) {
    await upsertLoanRow(loan).catch(() => null);
  }
  const leads = await readJson<StoredLead[]>(LEADS_PATH, []);
  for (const lead of leads) {
    await upsertLeadRow(lead).catch(() => null);
  }
}

async function listBlobUsers(): Promise<StoredUser[]> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return [];
  const users: StoredUser[] = [];
  let cursor = "";
  for (let page = 0; page < 20; page++) {
    const url = new URL("https://blob.vercel-storage.com");
    url.searchParams.set("limit", "1000");
    url.searchParams.set("prefix", `${STORE}/users/`);
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const body = (await res.json()) as {
      blobs?: { pathname?: string }[];
      cursor?: string;
      hasMore?: boolean;
    };
    for (const blob of body.blobs ?? []) {
      if (!blob.pathname) continue;
      const stored = await readObject<StoredUser>(blob.pathname);
      if (stored?.id && !stored.deletedAt) users.push(normalizeUser(stored));
    }
    if (!body.hasMore || !body.cursor) break;
    cursor = body.cursor;
  }
  return users;
}

async function insertUserRow(user: StoredUser): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO users (
      id, email, phone, password_hash, first_name, last_name, name, wallet,
      email_verified, verify_token_hash, verify_token_expires,
      reset_token_hash, reset_token_expires, created_at,       last_score, deleted_at, role, google_id
    ) VALUES (
      ${user.id}, ${user.email}, ${user.phone}, ${user.passwordHash},
      ${user.firstName}, ${user.lastName}, ${user.name}, ${user.wallet ?? null},
      ${Boolean(user.emailVerified)}, ${user.verifyTokenHash ?? null},
      ${user.verifyTokenExpires ?? null}, ${user.resetTokenHash ?? null},
      ${user.resetTokenExpires ?? null}, ${user.createdAt}, ${user.lastScore ?? null},
      ${user.deletedAt ?? null}, ${parseAccountRole(user.role)}, ${user.googleId ?? null}
    )
  `;
}

async function updateUserRow(user: StoredUser): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE users SET
      email = ${user.email},
      phone = ${user.phone},
      password_hash = ${user.passwordHash},
      first_name = ${user.firstName},
      last_name = ${user.lastName},
      name = ${user.name},
      wallet = ${user.wallet ?? null},
      email_verified = ${Boolean(user.emailVerified)},
      verify_token_hash = ${user.verifyTokenHash ?? null},
      verify_token_expires = ${user.verifyTokenExpires ?? null},
      reset_token_hash = ${user.resetTokenHash ?? null},
      reset_token_expires = ${user.resetTokenExpires ?? null},
      last_score = ${user.lastScore ?? null},
      deleted_at = ${user.deletedAt ?? null},
      role = ${parseAccountRole(user.role)},
      google_id = ${user.googleId ?? null}
    WHERE id = ${user.id}
  `;
}

async function upsertLoanRow(loan: StoredLoan): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO loans (
      id, email, wallet, amount_usdc, net_usdc, origination_usdc, app_fee_usdc,
      lead_id, repay_usdc, term_days, daily_rate, due_at, status,
      disburse_tx, repay_tx, created_at
    ) VALUES (
      ${loan.id}, ${loan.email ?? null}, ${loan.wallet}, ${loan.amount_usdc},
      ${loan.net_usdc ?? null}, ${loan.origination_usdc ?? null}, ${loan.app_fee_usdc ?? null},
      ${loan.lead_id ?? null}, ${loan.repay_usdc ?? null}, ${loan.term_days ?? null},
      ${loan.daily_rate ?? null}, ${loan.due_at ?? null}, ${loan.status},
      ${loan.disburse_tx ?? null}, ${loan.repay_tx ?? null}, ${loan.created_at}
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      wallet = EXCLUDED.wallet,
      amount_usdc = EXCLUDED.amount_usdc,
      net_usdc = EXCLUDED.net_usdc,
      origination_usdc = EXCLUDED.origination_usdc,
      app_fee_usdc = EXCLUDED.app_fee_usdc,
      lead_id = EXCLUDED.lead_id,
      repay_usdc = EXCLUDED.repay_usdc,
      term_days = EXCLUDED.term_days,
      daily_rate = EXCLUDED.daily_rate,
      due_at = EXCLUDED.due_at,
      status = EXCLUDED.status,
      disburse_tx = EXCLUDED.disburse_tx,
      repay_tx = EXCLUDED.repay_tx
  `;
}

async function upsertLeadRow(lead: StoredLead): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO leads (
      id, email, wallet, score, limit_kes, fee_kes, payer, status, lender, loan_id, created_at
    ) VALUES (
      ${lead.id}, ${lead.email ?? null}, ${lead.wallet}, ${lead.score ?? null},
      ${lead.limit_kes ?? null}, ${lead.fee_kes}, ${lead.payer}, ${lead.status},
      ${lead.lender ?? null}, ${lead.loan_id ?? null}, ${lead.created_at}
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      wallet = EXCLUDED.wallet,
      score = EXCLUDED.score,
      limit_kes = EXCLUDED.limit_kes,
      fee_kes = EXCLUDED.fee_kes,
      status = EXCLUDED.status,
      lender = EXCLUDED.lender,
      loan_id = EXCLUDED.loan_id
  `;
}

/** Read one JSON object from Blob, or from disk when Blob is not configured. */
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
    // wx fails if the file exists — used as a unique email/phone lock locally.
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
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`) as UserRow[];
    const row = rows[0];
    if (!row || row.deleted_at) return null;
    return userFromRow(row);
  }
  const stored = await readObject<StoredUser>(userPath(id));
  return stored ? normalizeUser(stored) : null;
}

export async function getUserByEmail(
  emailRaw: string
): Promise<StoredUser | null> {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM users WHERE email = ${email} AND deleted_at IS NULL LIMIT 1
    `) as UserRow[];
    return rows[0] ? userFromRow(rows[0]) : null;
  }
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
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM users WHERE phone = ${phone} AND deleted_at IS NULL LIMIT 1
    `) as UserRow[];
    return rows[0] ? userFromRow(rows[0]) : null;
  }
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
  if (await usingDb()) {
    if (mode === "create") await insertUserRow(user);
    else await updateUserRow(user);
    return;
  }
  await writeObject(userPath(user.id), user, mode);
}

export async function registerUser(input: {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: AccountRole;
}): Promise<{
  email: string;
  phone: string;
  name: string;
  firstName: string;
  lastName: string;
  verifyToken: string;
  role: AccountRole;
}> {
  const error = validateSignup(input);
  if (error) throw new Error(error);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const name = displayName(firstName, lastName);
  const role = parseAccountRole(input.role);
  // Live email and phone must be unique (Postgres indexes, or Blob index files).
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
    role,
  };
  if (await usingDb()) {
    try {
      await insertUserRow(user);
    } catch (err) {
      if (isAlreadyExistsError(err)) throw new DuplicateAccountError(duplicateField(err));
      throw err;
    }
    return { email, phone, name, firstName, lastName, verifyToken: verify.token, role };
  }
  // Blob path: create email/phone pointer files first so two signups cannot race.
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
  return { email, phone, name, firstName, lastName, verifyToken: verify.token, role };
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
  role: AccountRole;
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
  // timingSafeEqual avoids leaking password length via response time.
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
    role: parseAccountRole(user.role),
  };
}

export async function getUserByGoogleId(googleId: string): Promise<StoredUser | null> {
  const id = googleId.trim();
  if (!id) return null;
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM users WHERE google_id = ${id} AND deleted_at IS NULL LIMIT 1
    `) as UserRow[];
    return rows[0] ? userFromRow(rows[0]) : null;
  }
  return null;
}

export async function loginWithGoogle(input: {
  googleId: string;
  email: string;
}): Promise<{
  email: string;
  phone: string;
  name: string;
  firstName: string;
  lastName: string;
  wallet?: string | null;
  role: AccountRole;
}> {
  const googleId = input.googleId.trim();
  const email = normalizeEmail(input.email);
  if (!googleId || !email) {
    throw new LoginError("email", "Google did not share an email we can use.");
  }
  let user = await getUserByGoogleId(googleId);
  if (!user) {
    user = await getUserByEmail(email);
  }
  if (!user) {
    throw new LoginError(
      "email",
      "Create a Kredoof account first with this Gmail, then Continue with Google next time."
    );
  }
  if (user.googleId && user.googleId !== googleId) {
    throw new LoginError("email", "This email is already linked to another Google account.");
  }
  if (normalizeEmail(user.email) !== email && user.googleId !== googleId) {
    throw new LoginError(
      "email",
      "Use the same Gmail you used when you created your Kredoof account."
    );
  }
  user.googleId = googleId;
  user.emailVerified = true;
  await saveUser(user, "update");
  return {
    email: user.email,
    phone: user.phone,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    wallet: user.wallet,
    role: parseAccountRole(user.role),
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
  let user: StoredUser | null = null;
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM users WHERE verify_token_hash = ${hash} AND deleted_at IS NULL LIMIT 1
    `) as UserRow[];
    user = rows[0] ? userFromRow(rows[0]) : null;
  } else {
    const lookup = await readObject<{
      id?: string;
      email?: string;
      expires?: number;
    }>(verifyObjectPath(hash));
    user = lookup?.id
      ? await getUserById(lookup.id)
      : lookup?.email
        ? await getUserByEmail(lookup.email)
        : null;
    if (user && user.verifyTokenHash !== hash) user = null;
  }
  if (!user || user.verifyTokenHash !== hash) {
    throw new Error("This confirmation link is invalid");
  }
  const expires = user.verifyTokenExpires ?? 0;
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
  if (!(await usingDb())) {
    await writeObject(
      resetObjectPath(reset.hash),
      { id: user.id, email: user.email, expires: reset.expires },
      "update"
    ).catch(() => null);
  }
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
  let user: StoredUser | null = null;
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM users WHERE reset_token_hash = ${hash} AND deleted_at IS NULL LIMIT 1
    `) as UserRow[];
    user = rows[0] ? userFromRow(rows[0]) : null;
  } else {
    const lookup = await readObject<{
      id?: string;
      email?: string;
      expires?: number;
    }>(resetObjectPath(hash));
    user = lookup?.id
      ? await getUserById(lookup.id)
      : lookup?.email
        ? await getUserByEmail(lookup.email)
        : null;
  }
  if (!user || user.resetTokenHash !== hash) {
    throw new Error("This reset link is invalid");
  }
  const expires = user.resetTokenExpires ?? 0;
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
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`SELECT * FROM loans ORDER BY created_at DESC`) as Record<
      string,
      unknown
    >[];
    return rows.map(loanFromRow);
  }
  return readJson<StoredLoan[]>(LOANS_PATH, []);
}

export async function loansForAccount(input: {
  email?: string | null;
  wallet?: string | null;
}): Promise<StoredLoan[]> {
  const email = input.email ? normalizeEmail(input.email) : "";
  const wallet = input.wallet?.toLowerCase() ?? "";
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`
      SELECT * FROM loans
      WHERE (${email} <> '' AND email = ${email})
         OR (${wallet} <> '' AND wallet = ${wallet})
      ORDER BY created_at DESC
    `) as Record<string, unknown>[];
    return rows.map(loanFromRow);
  }
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
  // Soft-delete: keep the row, free the email/phone, scramble the password.
  user.deletedAt = Date.now();
  user.wallet = null;
  user.passwordHash = hashPassword(randomBytes(24).toString("hex"));
  await saveUser(user, "update");
  if (!(await usingDb())) {
    await writeObject(emailIndexPath(user.email), { id: "" }, "update").catch(
      () => null
    );
    if (user.phone) {
      await writeObject(phoneIndexPath(user.phone), { id: "" }, "update").catch(
        () => null
      );
    }
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
  if (await usingDb()) {
    await upsertLoanRow(loan);
    return loan;
  }
  const loans = await readJson<StoredLoan[]>(LOANS_PATH, []);
  const next = loans.filter((item) => item.id !== loan.id);
  next.unshift(loan);
  await writeJson(LOANS_PATH, next);
  return loan;
}

export async function listLeads(): Promise<StoredLead[]> {
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`SELECT * FROM leads ORDER BY created_at DESC`) as Record<
      string,
      unknown
    >[];
    return rows.map(leadFromRow);
  }
  return readJson<StoredLead[]>(LEADS_PATH, []);
}

export async function recordQualifiedLead(input: {
  email?: string | null;
  wallet: string;
  score?: number;
  limit_kes?: number;
}): Promise<StoredLead> {
  const email = input.email ? normalizeEmail(input.email) : "";
  const wallet = input.wallet.toLowerCase();
  if (await usingDb()) {
    const sql = getSql();
    const openRows = (await sql`
      SELECT * FROM leads
      WHERE status = 'offered'
        AND (
          (${email} <> '' AND email = ${email})
          OR wallet = ${wallet}
        )
      ORDER BY created_at DESC
      LIMIT 1
    `) as Record<string, unknown>[];
    if (openRows[0]) {
      const open = leadFromRow(openRows[0]);
      open.score = input.score ?? open.score;
      open.limit_kes = input.limit_kes ?? open.limit_kes;
      await upsertLeadRow(open);
      return open;
    }
    const lead: StoredLead = {
      id: newLoanId(),
      email: email || null,
      wallet,
      score: input.score,
      limit_kes: input.limit_kes,
      fee_kes: LEAD_FEE_KES,
      payer: "lender",
      status: "offered",
      lender: "marketplace",
      loan_id: null,
      created_at: Date.now(),
    };
    await upsertLeadRow(lead);
    return lead;
  }
  const leads = await listLeads();
  const open = leads.find((lead) => {
    if (lead.status !== "offered") return false;
    const matchEmail = email && lead.email && normalizeEmail(lead.email) === email;
    const matchWallet = lead.wallet.toLowerCase() === wallet;
    return Boolean(matchEmail || matchWallet);
  });
  if (open) {
    open.score = input.score ?? open.score;
    open.limit_kes = input.limit_kes ?? open.limit_kes;
    await writeJson(LEADS_PATH, leads);
    return open;
  }
  const lead: StoredLead = {
    id: newLoanId(),
    email: email || null,
    wallet,
    score: input.score,
    limit_kes: input.limit_kes,
    fee_kes: LEAD_FEE_KES,
    payer: "lender",
    status: "offered",
    lender: "marketplace",
    loan_id: null,
    created_at: Date.now(),
  };
  leads.unshift(lead);
  await writeJson(LEADS_PATH, leads);
  return lead;
}

export async function markLeadFunded(input: {
  email?: string | null;
  wallet: string;
  loanId: string;
  leadId?: string | null;
}): Promise<StoredLead | null> {
  const email = input.email ? normalizeEmail(input.email) : "";
  const wallet = input.wallet.toLowerCase();
  const leads = await listLeads();
  const lead = input.leadId
    ? leads.find((item) => item.id === input.leadId) ?? null
    : leads.find((item) => {
        if (item.status === "funded") return false;
        const matchEmail = email && item.email && normalizeEmail(item.email) === email;
        const matchWallet = item.wallet.toLowerCase() === wallet;
        return Boolean(matchEmail || matchWallet);
      }) ?? null;
  if (!lead) return null;
  lead.status = "funded";
  lead.loan_id = input.loanId;
  if (await usingDb()) {
    await upsertLeadRow(lead);
    return lead;
  }
  await writeJson(LEADS_PATH, leads);
  return lead;
}

function marketplaceCard(
  lead: StoredLead,
  viewer: string,
  extra: { borrowerName?: string } = {}
): MarketplaceFile {
  const mine = Boolean(lead.lender && lead.lender === viewer);
  const claimed = lead.status === "claimed" || lead.status === "funded";
  return {
    id: lead.id,
    score: lead.score,
    limit_kes: lead.limit_kes,
    fee_kes: lead.fee_kes,
    status: lead.status,
    created_at: lead.created_at,
    exclusive: claimed,
    borrowerName: mine ? extra.borrowerName : undefined,
    wallet: mine ? lead.wallet : undefined,
  };
}

export async function listLenderMarketplace(lenderEmail: string): Promise<{
  open: MarketplaceFile[];
  mine: MarketplaceFile[];
}> {
  const viewer = normalizeEmail(lenderEmail);
  const leads = await listLeads();
  const open = leads
    .filter((lead) => lead.status === "offered")
    .map((lead) => marketplaceCard(lead, viewer));
  const mineLeads = leads.filter(
    (lead) =>
      (lead.status === "claimed" || lead.status === "funded") &&
      lead.lender === viewer
  );
  const mine: MarketplaceFile[] = [];
  for (const lead of mineLeads) {
    const borrower = lead.email ? await getUserByEmail(lead.email) : null;
    mine.push(
      marketplaceCard(lead, viewer, {
        borrowerName: borrower?.name,
      })
    );
  }
  return { open, mine };
}

export async function claimLeadExclusive(
  leadId: string,
  lenderEmail: string
): Promise<StoredLead> {
  const viewer = normalizeEmail(lenderEmail);
  const leads = await listLeads();
  const lead = leads.find((item) => item.id === leadId);
  if (!lead) throw new Error("That file is gone");
  if (lead.status === "funded") throw new Error("Already funded");
  if (lead.status === "claimed" && lead.lender && lead.lender !== viewer) {
    throw new Error("Another lender already took this file");
  }
  if (lead.status === "claimed" && lead.lender === viewer) return lead;
  lead.status = "claimed";
  lead.lender = viewer;
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`
      UPDATE leads
      SET status = 'claimed', lender = ${viewer}
      WHERE id = ${leadId} AND status = 'offered'
      RETURNING *
    `) as Record<string, unknown>[];
    if (!rows[0]) {
      const current = (await sql`SELECT * FROM leads WHERE id = ${leadId} LIMIT 1`) as Record<
        string,
        unknown
      >[];
      const now = current[0] ? leadFromRow(current[0]) : null;
      if (now?.status === "claimed" && now.lender === viewer) return now;
      throw new Error("Another lender already took this file");
    }
    return leadFromRow(rows[0]);
  }
  await writeJson(LEADS_PATH, leads);
  return lead;
}

export async function getClaimedLeadForLender(
  leadId: string,
  lenderEmail: string
): Promise<StoredLead | null> {
  const viewer = normalizeEmail(lenderEmail);
  const leads = await listLeads();
  const lead = leads.find((item) => item.id === leadId) ?? null;
  if (!lead) return null;
  if (lead.lender !== viewer) return null;
  if (lead.status !== "claimed" && lead.status !== "funded") return null;
  return lead;
}

export async function updateLoan(
  id: string,
  patch: Partial<StoredLoan>
): Promise<StoredLoan> {
  if (await usingDb()) {
    const sql = getSql();
    const rows = (await sql`SELECT * FROM loans WHERE id = ${id} LIMIT 1`) as Record<
      string,
      unknown
    >[];
    if (!rows[0]) throw new Error("Unknown loan");
    const loan = { ...loanFromRow(rows[0]), ...patch };
    await upsertLoanRow(loan);
    return loan;
  }
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

/** Copy Blob users even if Postgres already has rows (skips duplicates). */
export async function migrateFromBlob(): Promise<{ users: number; loans: number; leads: number }> {
  if (!dbEnabled()) {
    throw new Error("DATABASE_URL is not set");
  }
  await ensureSchema();
  const users = await listBlobUsers();
  for (const user of users) {
    try {
      await insertUserRow(user);
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
    }
  }
  const loans = await readJson<StoredLoan[]>(LOANS_PATH, []);
  for (const loan of loans) {
    await upsertLoanRow(loan).catch(() => null);
  }
  const leads = await readJson<StoredLead[]>(LEADS_PATH, []);
  for (const lead of leads) {
    await upsertLeadRow(lead).catch(() => null);
  }
  const sql = getSql();
  const userRows = (await sql`SELECT count(*)::int AS n FROM users`) as { n: number }[];
  const loanRows = (await sql`SELECT count(*)::int AS n FROM loans`) as { n: number }[];
  const leadRows = (await sql`SELECT count(*)::int AS n FROM leads`) as { n: number }[];
  return {
    users: userRows[0]?.n ?? 0,
    loans: loanRows[0]?.n ?? 0,
    leads: leadRows[0]?.n ?? 0,
  };
}
