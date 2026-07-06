export interface Task {
  id: string;
  title: string;
  category: string;
  assignee: string;
  due_date: string | null;
  status: 'pending' | 'done';
  notes: string;
  vendor: string;
  contact: string;
  price: number;
  created_at: string;
}

export interface TimelineMilestone {
  id: string;
  title: string;
  description: string;
  target_date: string;
  is_completed: boolean;
  created_at: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  sort_order: number;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  vendor: string;
  contact: string;
  total_expense: number;
  advance_paid: number;
  advance_date: string | null;
  due_date: string | null;
  status: 'not_paid' | 'advance_paid' | 'settled';
  assignee: string;
  side: 'bride' | 'groom';
  notes: string;
  created_at: string;
}

export const TASK_CATEGORIES = [
  'Venue & Church',
  'Photography & Video',
  'Catering & Food',
  'Decor & Flowers',
  'Attire & Grooming',
  'Invitations',
  'Music & Entertainment',
  'Transport',
  'Gifts & Favours',
  'Other',
] as const;

export interface GuestItem {
  id: string;
  first_name: string;
  last_name: string;
  side: 'bride' | 'groom';
  rsvp_status: 'pending' | 'confirmed' | 'declined';
  meal_preference: string;
  save_the_date_sent: boolean;
  invitation_sent: boolean;
  category: string;
  count: number;
  confirmed_count: number | null;
  address: string;
  gifted_amount: number;
  created_at: string;
}

/** Headcount actually attending when RSVP is confirmed; falls back to invited count. */
export function attendingCount(guest: GuestItem): number {
  if (guest.rsvp_status !== 'confirmed') return 0;
  return guest.confirmed_count ?? guest.count;
}

/** Headcount for pending/declined tallies (invitation size). */
export function invitedHeadcount(guest: GuestItem): number {
  return guest.count;
}

export const GUEST_CATEGORIES = [
  'Office',
  'Family',
  'School',
  'Uni',
  'Relations',
  'Students',
  'Friends',
  'Retinue',
  'Extended Family',
] as const;

export const BUDGET_CATEGORIES = [
  'Venue & Church',
  'Photography & Video',
  'Catering & Food',
  'Decor & Flowers',
  'Attire & Grooming',
  'Invitations & Stationery',
  'Music & Entertainment',
  'Transport',
  'Hair & Makeup',
  'Jewellery',
  'Cake',
  'Gifts & Favours',
  'Honeymoon',
  'Other',
] as const;
