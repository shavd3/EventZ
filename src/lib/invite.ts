/**
 * Builds the personal invitation links that the wedding-invite app serves.
 *
 * These helpers mirror `wedding-invite/src/lib/guest.ts` — keep them in step. The invitation
 * site only reads the trailing token (`extractTokenFromSlug` splits on the last dash), so the
 * name portion is cosmetic, but matching its output keeps the two admin screens showing the
 * same URL for the same guest.
 */

function titleCase(part: string): string {
  return part
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function displayName(firstName: string, lastName: string): string {
  const first = titleCase(firstName);
  const last = titleCase(lastName);
  if (!first && !last) return 'Friend';
  return [first, last].filter(Boolean).join(' ');
}

export function guestDisplayName(firstName: string, lastName: string): string {
  return displayName(firstName, lastName);
}

function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'guest'
  );
}

export function inviteSlug(firstName: string, lastName: string, token: string): string {
  return `${slugifyName(displayName(firstName, lastName))}-${token}`;
}

/** Absolute invite URL, or null when NEXT_PUBLIC_INVITE_URL has not been configured. */
export function inviteUrl(firstName: string, lastName: string, token: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_INVITE_URL?.replace(/\/$/, '');
  if (!base || !token) return null;
  return `${base}/${inviteSlug(firstName, lastName, token)}`;
}

/** WhatsApp-ready invite text — keep in step with wedding-invite/src/lib/constants.ts. */
export function buildInviteShareMessage(guestName: string, inviteUrl: string): string {
  return [
    'On behalf of our parents,',
    `Dear ${guestName} ❤️`,
    '',
    "Our journey together wouldn't be complete without the people we treasure most. We would be deeply honored by your presence on our wedding day💍",
    '',
    'Please click on the link to view the invitation and submit your response.',
    inviteUrl,
    '',
    'Kindly favour us with your response by the 20th of September✨',
  ].join('\n');
}

/** Six hex characters, matching the format the SQL migration backfilled. */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
