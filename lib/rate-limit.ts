import { dbEnabled, ensureSchema, getSql } from "@/lib/db";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function clientKey(request: Request, extra = ""): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip =
    forwarded.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  return extra ? `${ip}:${extra}` : ip;
}

/** Returns milliseconds to wait, or 0 if allowed. */
export async function tooSoon(
  key: string,
  limit: number,
  windowMs: number
): Promise<number> {
  if (dbEnabled()) {
    try {
      return await tooSoonDb(key, limit, windowMs);
    } catch {
      return tooSoonMemory(key, limit, windowMs);
    }
  }
  return tooSoonMemory(key, limit, windowMs);
}

export function retryAfterSeconds(waitMs: number): number {
  return Math.max(1, Math.ceil(waitMs / 1000));
}

function tooSoonMemory(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  if (current.count >= limit) {
    return current.resetAt - now;
  }
  current.count += 1;
  return 0;
}

async function tooSoonDb(
  key: string,
  limit: number,
  windowMs: number
): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  const now = Date.now();
  const resetAt = now + windowMs;
  const rows = (await sql`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.reset_at <= ${now} THEN 1
        ELSE rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at <= ${now} THEN ${resetAt}
        ELSE rate_limits.reset_at
      END
    RETURNING count, reset_at
  `) as { count: number; reset_at: string | number }[];
  const row = rows[0];
  if (!row) return 0;
  const count = Number(row.count);
  const until = Number(row.reset_at);
  if (count > limit) return Math.max(1, until - now);
  return 0;
}
