import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpOtpauthUrl(account: string, secret: string): string {
  const label = encodeURIComponent(`Kredoof:${account}`);
  const issuer = encodeURIComponent("Kredoof");
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=${STEP_SECONDS}`;
}

export function verifyTotp(secret: string, code: string): boolean {
  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) return false;
  const key = base32Decode(secret);
  if (!key.length) return false;
  const now = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  const offered = Buffer.from(trimmed);
  for (const step of [now - 1, now, now + 1]) {
    const expected = Buffer.from(hotp(key, step));
    if (
      expected.length === offered.length &&
      timingSafeEqual(expected, offered)
    ) {
      return true;
    }
  }
  return false;
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/g, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return Buffer.alloc(0);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
