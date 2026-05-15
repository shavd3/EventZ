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
