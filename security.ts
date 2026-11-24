import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/**
 * PBKDF2-HMAC-SHA256 with a per-user random salt.
 * 30 000 iterations is a deliberate trade-off: OWASP's desktop figure (600 000) would freeze the
 * JS thread on a phone because there is no native PBKDF2 in Expo. Documented in the report.
 */
export const PBKDF2_ITERATIONS = 30_000;

export function hashPassword(password: string, saltHex: string, iterations = PBKDF2_ITERATIONS): string {
  const derived = pbkdf2(sha256, utf8ToBytes(password), utf8ToBytes(saltHex), {
    c: iterations,
    dkLen: 32,
  });
  return bytesToHex(derived);
}

/** Compare without early exit so timing does not leak how many characters matched. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function verifyPassword(
  password: string,
  saltHex: string,
  expectedHashHex: string,
  iterations = PBKDF2_ITERATIONS,
): boolean {
  return constantTimeEqual(hashPassword(password, saltHex, iterations), expectedHashHex);
}

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_SECONDS = 60;

/** Returns whole seconds still locked, or 0 if the account may attempt a login. */
export function lockoutRemaining(lockedUntil: number | null, now = Date.now()): number {
  if (!lockedUntil || lockedUntil <= now) return 0;
  return Math.ceil((lockedUntil - now) / 1000);
}
