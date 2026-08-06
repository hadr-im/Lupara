/**
 * Password hashing using PBKDF2 via the Web Crypto API.
 *
 * Web Crypto (`crypto.subtle`) is available both in Node 20+ and on Cloudflare
 * Workers, so this works in dev and in production without native dependencies
 * (bcrypt/argon2 don't run on Workers).
 *
 * Stored format:  pbkdf2$<iterations>$<saltB64>$<hashB64>
 */

const ITERATIONS = 100_000;
const KEY_LEN = 32; // bytes
const encoder = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    KEY_LEN * 8,
  );
  return new Uint8Array(bits);
}

/** Constant-time string comparison to avoid timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(plain, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored?.split("$");
  if (!parts || parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = fromB64(parts[2]);
  const expected = parts[3];
  const actual = toB64(await derive(plain, salt, iterations));
  return timingSafeEqual(actual, expected);
}
