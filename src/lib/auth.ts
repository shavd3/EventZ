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
