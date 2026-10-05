import { createHash, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE = 'planner_session';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Cookie value for a signed-in session. Derived from the password, so changing
 * ADMIN_PASSWORD invalidates every outstanding session.
 */
export function sessionToken(): string {
  return sha256(`planner:${process.env.ADMIN_PASSWORD ?? ''}`).toString('hex');
}

export function isConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Constant-time compare — hashing first guarantees equal-length buffers. */
export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected) return false;
  return timingSafeEqual(sha256(candidate), sha256(expected));
}

/**
 * Secret for the read-only vendor agenda link (/agenda/<key>). Derived from the password so it
 * needs no extra configuration and never appears in the public repo; changing ADMIN_PASSWORD
 * changes the link (re-share it). Null when no password is set, which disables the link.
 */
export function agendaShareKey(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return sha256(`agenda:${password}`).toString('hex').slice(0, 20);
}

export function agendaKeyMatches(candidate: string): boolean {
  const expected = agendaShareKey();
  if (!expected) return false;
  return timingSafeEqual(sha256(candidate), sha256(expected));
}
