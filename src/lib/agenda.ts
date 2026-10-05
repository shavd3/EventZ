// Wedding-day agenda: types and pure helpers. Safe to import from client components —
// nothing here touches Supabase (the vendor page must not ship the anon key).

export const WEDDING_DATE = '2026-10-10';

export interface AgendaItem {
  id: string;
  /** Postgres time, read back as HH:MM:SS. */
  start_time: string;
  /** Only set for kind 'block'. */
  end_time: string | null;
  /** 'step' = something happens at a moment; 'block' = a stretch of time (dressing, Mass, dinner). */
  kind: 'step' | 'block';
  who: string;
  event: string;
  vehicle: string;
  contact: string;
  location_name: string;
  location_url: string;
  notes: string;
  sort_order: number;
  created_at: string;
}

export type AgendaLoad = { items: AgendaItem[]; error: null } | { items: []; error: 'missing' | string };

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** "15:30:00" → { clock: "3:30", meridiem: "PM" } */
export function clockParts(time: string): { clock: string; meridiem: 'AM' | 'PM' } {
  const [h, m] = time.split(':').map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { clock: `${hour}:${String(m).padStart(2, '0')}`, meridiem: h < 12 ? 'AM' : 'PM' };
}

export function formatTime(time: string): string {
  const { clock, meridiem } = clockParts(time);
  return `${clock} ${meridiem}`;
}

/** "4:30 – 9:30 AM", or "10:30 AM – 2:00 PM" when the range crosses noon. */
export function formatRange(start: string, end: string | null): string {
  if (!end) return formatTime(start);
  const a = clockParts(start);
  const b = clockParts(end);
  return a.meridiem === b.meridiem ? `${a.clock} – ${b.clock} ${b.meridiem}` : `${formatTime(start)} – ${formatTime(end)}`;
}

/** Time order; equal times keep their sort_order (the order they were planned in). */
export function sortAgenda(items: AgendaItem[]): AgendaItem[] {
  return [...items].sort(
    (a, b) => minutesOf(a.start_time) - minutesOf(b.start_time) || a.sort_order - b.sort_order,
  );
}

/** Vehicles in order of first use, with how many trips each makes. */
export function vehiclesOf(items: AgendaItem[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of sortAgenda(items)) {
    const v = item.vehicle.trim();
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count }));
}

/** Splits "Shenali +94 77 454 9883 · Shermila …" into text and tappable phone numbers. */
export function contactParts(contact: string): { text: string; tel?: string }[] {
  const parts: { text: string; tel?: string }[] = [];
  const re = /\+?\d[\d\s-]{7,}\d/g;
  let last = 0;
  for (const match of contact.matchAll(re)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: contact.slice(last, at) });
    parts.push({ text: match[0], tel: match[0].replace(/[^\d+]/g, '') });
    last = at + match[0].length;
  }
  if (last < contact.length) parts.push({ text: contact.slice(last) });
  return parts;
}

// One colour per vehicle (by order of first use). Literal class strings so Tailwind keeps them.
export const VEHICLE_STYLES = [
  { chip: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500', on: 'bg-sky-600 text-white border-sky-600' },
  { chip: 'bg-violet-50 text-violet-800 border-violet-200', dot: 'bg-violet-500', on: 'bg-violet-600 text-white border-violet-600' },
  { chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', on: 'bg-emerald-600 text-white border-emerald-600' },
  { chip: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500', on: 'bg-rose-600 text-white border-rose-600' },
  { chip: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', on: 'bg-amber-600 text-white border-amber-600' },
  { chip: 'bg-teal-50 text-teal-800 border-teal-200', dot: 'bg-teal-500', on: 'bg-teal-600 text-white border-teal-600' },
  { chip: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500', on: 'bg-indigo-600 text-white border-indigo-600' },
  { chip: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-500', on: 'bg-orange-600 text-white border-orange-600' },
] as const;

export function isMissingTable(error: { code?: string; message: string }): boolean {
  return error.code === 'PGRST205' || /schema cache|does not exist/i.test(error.message);
}
