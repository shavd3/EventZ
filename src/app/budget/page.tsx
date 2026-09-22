'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { BudgetItem, PaymentMethod } from '@/lib/types';
import { Plus, Trash2, Edit2, X, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import Dropdown from '@/components/Dropdown';

function formatLKR(amount: number) {
  return 'Rs. ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

function optionalNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function fieldNumber(value: number | string | null | undefined): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

function moneyOrNull(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function derivedTotal(pax: number | null, price: number | null): number | null {
  if (pax == null || price == null) return null;
  return Math.round(pax * price * 100) / 100;
}

function effectiveTotal(item: BudgetItem): number {
  return derivedTotal(moneyOrNull(item.pax_count), moneyOrNull(item.price_per_pax)) ?? Number(item.total_expense);
}

function remainingOf(item: BudgetItem): number {
  return effectiveTotal(item) - Number(item.advance_paid);
}

function diffOf(item: BudgetItem): number | null {
  const expected = moneyOrNull(item.expected_budget);
  if (expected == null) return null;
  return effectiveTotal(item) - expected;
}

type BudgetSortField =
  | 'category'
  | 'vendor'
  | 'expected'
  | 'total'
  | 'diff'
  | 'pax'
  | 'per_pax'
  | 'advance'
  | 'advance_date'
  | 'remaining'
  | 'due_date'
  | 'payment'
  | 'status'
  | 'assignee'
  | 'side';

type PayFilter = '' | 'owing' | 'not_paid' | 'advance_paid' | 'settled';

const SORT_OPTIONS: { value: BudgetSortField | ''; label: string }[] = [
  { value: '', label: 'Default order' },
  { value: 'category', label: 'Category' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'expected', label: 'Expected' },
  { value: 'total', label: 'Total' },
  { value: 'diff', label: 'Diff' },
  { value: 'pax', label: 'Pax' },
  { value: 'per_pax', label: 'Per pax' },
  { value: 'advance', label: 'Advance' },
  { value: 'advance_date', label: 'Advance date' },
  { value: 'remaining', label: 'Remaining' },
  { value: 'due_date', label: 'Due date' },
  { value: 'payment', label: 'Payment' },
  { value: 'status', label: 'Status' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'side', label: 'Side' },
];

function sortValue(item: BudgetItem, field: BudgetSortField): string | number | null {
  switch (field) {
    case 'category':
      return item.category.toLowerCase();
    case 'vendor':
      return item.vendor.toLowerCase();
    case 'expected':
      return moneyOrNull(item.expected_budget);
    case 'total':
      return effectiveTotal(item);
    case 'diff':
      return diffOf(item);
    case 'pax':
      return moneyOrNull(item.pax_count);
    case 'per_pax':
      return moneyOrNull(item.price_per_pax);
    case 'advance':
      return Number(item.advance_paid);
    case 'advance_date':
      return item.advance_date || null;
    case 'remaining':
      return remainingOf(item);
    case 'due_date':
      return item.due_date || null;
    case 'payment':
      return paymentLabel(item.payment_method).toLowerCase();
    case 'status':
      return item.status;
    case 'assignee':
      return (item.assignee || '').toLowerCase();
    case 'side':
      return item.side;
  }
}

function payFilterLabel(value: PayFilter): string {
  if (value === 'owing') return 'To be paid';
  if (value === 'not_paid') return 'Not paid';
  if (value === 'advance_paid') return 'Advance paid';
  if (value === 'settled') return 'Settled';
  return 'All payments';
}

function payFilterValue(label: string): PayFilter {
  if (label === 'To be paid') return 'owing';
  if (label === 'Not paid') return 'not_paid';
  if (label === 'Advance paid') return 'advance_paid';
  if (label === 'Settled') return 'settled';
  return '';
}

type BudgetForm = {
  category: string;
  vendor: string;
  expected_budget: string;
  total_expense: string;
  price_per_pax: string;
  pax_count: string;
  advance_paid: string;
  advance_date: string;
  due_date: string;
  status: 'not_paid' | 'advance_paid' | 'settled';
  payment_method: '' | PaymentMethod;
  assignee: string;
  side: 'bride' | 'groom';
  notes: string;
};

function formWithCount(current: BudgetForm, patch: Partial<Pick<BudgetForm, 'pax_count' | 'price_per_pax'>>): BudgetForm {
  const next = { ...current, ...patch };
  const total = derivedTotal(optionalNumber(next.pax_count), optionalNumber(next.price_per_pax));
  if (total == null) return next;
  return { ...next, total_expense: fieldNumber(total) };
}

const emptyForm: BudgetForm = {
  category: '',
  vendor: '',
  expected_budget: '',
  total_expense: '',
  price_per_pax: '',
  pax_count: '',
  advance_paid: '',
  advance_date: '',
  due_date: '',
  status: 'not_paid',
  payment_method: '',
  assignee: '',
  side: 'groom',
  notes: '',
};

const PAYMENT_LABELS: Record<string, '' | PaymentMethod> = {
  '': '',
  Debit: 'debit',
  Credit: 'credit',
  Cash: 'cash',
};

function paymentLabel(method: string | null | undefined): string {
  if (method === 'debit') return 'Debit';
  if (method === 'credit') return 'Credit';
  if (method === 'cash') return 'Cash';
  return '';
}

type EditableField =
  | 'category'
  | 'vendor'
  | 'expected_budget'
  | 'total_expense'
  | 'pax_count'
  | 'price_per_pax'
  | 'advance_paid'
  | 'advance_date'
  | 'due_date'
  | 'payment_method'
  | 'status'
  | 'assignee'
  | 'side';

type MoveDir = 'up' | 'down' | 'left' | 'right';

const EDITABLE_FIELDS: EditableField[] = [
  'category',
  'vendor',
  'expected_budget',
  'total_expense',
  'pax_count',
  'price_per_pax',
  'advance_paid',
  'advance_date',
  'due_date',
  'payment_method',
  'status',
  'assignee',
  'side',
];

const CHOICE_FIELDS = new Set<EditableField>(['category', 'payment_method', 'status', 'side']);

const STATUS_OPTIONS = [
  { value: 'not_paid', label: 'Not Paid' },
  { value: 'advance_paid', label: 'Advance Paid' },
  { value: 'settled', label: 'Settled' },
];

const SIDE_OPTIONS = [
  { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' },
];

const PAYMENT_OPTIONS = [
  { value: '', label: '—' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'cash', label: 'Cash' },
];

function blank() {
  return <span className="text-warm-gray-light">—</span>;
}

function formatDay(value: string | null | undefined) {
  if (!value) return blank();
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function dateField(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function valueOf(item: BudgetItem, field: EditableField): string {
  switch (field) {
    case 'category':
      return item.category || '';
    case 'vendor':
      return item.vendor || '';
    case 'expected_budget':
      return fieldNumber(item.expected_budget);
    case 'total_expense':
      return fieldNumber(effectiveTotal(item));
    case 'pax_count':
      return fieldNumber(item.pax_count);
    case 'price_per_pax':
      return fieldNumber(item.price_per_pax);
    case 'advance_paid':
      return fieldNumber(item.advance_paid);
    case 'advance_date':
      return dateField(item.advance_date);
    case 'due_date':
      return dateField(item.due_date);
    case 'payment_method':
      return item.payment_method || '';
    case 'status':
      return item.status;
    case 'assignee':
      return item.assignee || '';
    case 'side':
      return item.side;
  }
}

function payloadFor(field: EditableField, raw: string): Partial<BudgetItem> {
  switch (field) {
    case 'expected_budget':
    case 'price_per_pax':
    case 'pax_count':
      return { [field]: optionalNumber(raw) };
    case 'total_expense':
    case 'advance_paid':
      return { [field]: parseFloat(raw) || 0 };
    case 'advance_date':
    case 'due_date':
      return { [field]: raw || null };
    case 'payment_method':
      return { payment_method: (raw || null) as PaymentMethod | null };
    case 'vendor':
      return { vendor: raw.trim() || 'TBD' };
    case 'status':
      return { status: raw as BudgetItem['status'] };
    case 'side':
      return { side: raw as BudgetItem['side'] };
    case 'category':
      return { category: raw };
    case 'assignee':
      return { assignee: raw };
  }
}

function sameValue(current: unknown, next: unknown): boolean {
  if (typeof next === 'number') return Number(current) === next;
  if (next == null) return current == null || current === '';
  if (typeof next === 'string' && typeof current === 'string' && current.slice(0, 10) === next && next.length === 10 && current.length >= 10) {
    return true;
  }
  return current === next;
}

function ChoiceMenu({
  options,
  value,
  anchorRef,
  onPick,
  onClose,
}: {
  options: { value: string; label: string }[];
  value: string;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onPick: (value: string, dir?: MoveDir) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [hi, setHi] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const height = options.length * 36 + 12;
    const width = Math.max(rect.width, 148);
    const openUp = window.innerHeight - rect.bottom < height + 8 && rect.top > height;
    setBox({
      top: openUp ? rect.top - height - 2 : rect.bottom + 2,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
    });
  }, [anchorRef, options.length]);

  useEffect(() => {
    if (box) menuRef.current?.focus();
  }, [box]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onCloseRef.current();
    }
    const originTop = anchorRef.current?.getBoundingClientRect().top ?? 0;
    function onScroll() {
      const nextTop = anchorRef.current?.getBoundingClientRect().top;
      if (nextTop == null || Math.abs(nextTop - originTop) > 4) onCloseRef.current();
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [anchorRef]);

  if (!box || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      tabIndex={-1}
      className="excel-menu"
      style={{ position: 'fixed', top: box.top, left: box.left, minWidth: box.width, zIndex: 60 }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setHi((current) => Math.min(options.length - 1, current + 1));
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setHi((current) => Math.max(0, current - 1));
        } else if (event.key === 'Enter') {
          event.preventDefault();
          onPick(options[hi].value, 'down');
        } else if (event.key === 'Tab') {
          event.preventDefault();
          onPick(options[hi].value, event.shiftKey ? 'left' : 'right');
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {options.map((option, index) => (
        <button
          key={option.value || 'blank'}
          type="button"
          className={index === hi ? 'is-hi' : ''}
          onMouseEnter={() => setHi(index)}
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

function ExcelCell({
  align,
  kind,
  active,
  draft,
  display,
  options,
  onOpen,
  onDraft,
  onCommit,
  onCancel,
  onMove,
  onPick,
}: {
  align: 'left' | 'right' | 'center';
  kind: 'text' | 'money' | 'count' | 'date' | 'choice';
  active: boolean;
  draft: string;
  display: React.ReactNode;
  options?: { value: string; label: string }[];
  onOpen: () => void;
  onDraft: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onMove: (dir: MoveDir) => void;
  onPick: (value: string, dir?: MoveDir) => void;
}) {
  const skipBlur = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const alignClass = align === 'right' ? 'align-right' : align === 'center' ? 'align-center' : '';

  return (
    <td className={`sheet-td ${active ? 'is-active' : ''} ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}>
      {active && kind !== 'choice' ? (
        <input
          autoFocus
          className={`excel-input ${align === 'right' ? 'is-right' : ''}`}
          type={kind === 'date' ? 'date' : 'text'}
          inputMode={kind === 'money' || kind === 'count' ? 'decimal' : undefined}
          value={draft}
          autoComplete="off"
          onFocus={(event) => {
            if (kind !== 'date') event.currentTarget.select();
          }}
          onChange={(event) => onDraft(event.target.value)}
          onBlur={() => {
            if (skipBlur.current) {
              skipBlur.current = false;
              return;
            }
            onCommit();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              skipBlur.current = true;
              onCancel();
            } else if (event.key === 'Enter') {
              event.preventDefault();
              skipBlur.current = true;
              onMove('down');
            } else if (event.key === 'Tab') {
              event.preventDefault();
              skipBlur.current = true;
              onMove(event.shiftKey ? 'left' : 'right');
            }
          }}
        />
      ) : (
        <button ref={btnRef} type="button" className={`excel-display ${alignClass}`} onClick={onOpen}>
          {display}
        </button>
      )}
      {active && kind === 'choice' && options && (
        <ChoiceMenu options={options} value={draft} anchorRef={btnRef} onPick={onPick} onClose={onCancel} />
      )}
    </td>
  );
}

export default function BudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [filterSide, setFilterSide] = useState<'all' | 'bride' | 'groom'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPay, setFilterPay] = useState<PayFilter>('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<BudgetSortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [active, setActive] = useState<{ id: string; field: EditableField } | null>(null);
  const [draft, setDraft] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('name')
      .order('sort_order', { ascending: true });
    const names = (data || []).map((c) => c.name);
    setCategories(names);
    return names;
  }

  async function fetchItems() {
    const { data } = await supabase
      .from('budget_items')
      .select('*')
      .order('created_at', { ascending: true });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCategories().then((cats) => {
      setForm((f) => ({ ...f, category: f.category || cats[0] || '' }));
    });
    fetchItems();
  }, []);

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      category: form.category,
      vendor: form.vendor || 'TBD',
      expected_budget: optionalNumber(form.expected_budget),
      total_expense: derivedTotal(optionalNumber(form.pax_count), optionalNumber(form.price_per_pax)) ?? (parseFloat(form.total_expense) || 0),
      price_per_pax: optionalNumber(form.price_per_pax),
      pax_count: optionalNumber(form.pax_count),
      advance_paid: parseFloat(form.advance_paid) || 0,
      advance_date: form.advance_date || null,
      due_date: form.due_date || null,
      status: form.status,
      payment_method: form.payment_method || null,
      assignee: form.assignee,
      side: form.side,
      notes: form.notes,
    };

    if (editId) {
      await supabase.from('budget_items').update(payload).eq('id', editId);
    } else {
      await supabase.from('budget_items').insert(payload);
    }

    setForm(emptyForm);
    setShowForm(false);
    setEditId(null);
    fetchItems();
  }

  function startEdit(item: BudgetItem) {
    setForm({
      category: item.category,
      vendor: item.vendor,
      expected_budget: fieldNumber(item.expected_budget),
      total_expense: fieldNumber(effectiveTotal(item)),
      price_per_pax: fieldNumber(item.price_per_pax),
      pax_count: fieldNumber(item.pax_count),
      advance_paid: fieldNumber(item.advance_paid),
      advance_date: item.advance_date || '',
      due_date: item.due_date || '',
      status: item.status,
      payment_method: item.payment_method || '',
      assignee: item.assignee,
      side: item.side,
      notes: item.notes,
    });
    setEditId(item.id);
    setShowForm(true);
    setActive(null);
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this budget item?')) return;
    await supabase.from('budget_items').delete().eq('id', id);
    fetchItems();
  }

  function rowAfterEdit(item: BudgetItem, field: EditableField, raw: string): BudgetItem {
    const patch = payloadFor(field, raw);
    if (field === 'total_expense' && derivedTotal(moneyOrNull(item.pax_count), moneyOrNull(item.price_per_pax)) != null) {
      return item;
    }
    if (field === 'pax_count' || field === 'price_per_pax') {
      const pax = field === 'pax_count' ? patch.pax_count ?? null : moneyOrNull(item.pax_count);
      const price = field === 'price_per_pax' ? patch.price_per_pax ?? null : moneyOrNull(item.price_per_pax);
      const total = derivedTotal(pax, price);
      if (total != null) patch.total_expense = total;
    }
    return { ...item, ...patch };
  }

  async function commitField(item: BudgetItem, field: EditableField, raw: string) {
    const next = rowAfterEdit(item, field, raw);
    const patch: Partial<BudgetItem> = { [field]: next[field] };
    if (field === 'pax_count' || field === 'price_per_pax') patch.total_expense = next.total_expense;
    const changed = (Object.keys(patch) as (keyof BudgetItem)[]).some((key) => !sameValue(item[key], patch[key]));
    if (!changed) return;
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, ...patch } : row)));
    const { error } = await supabase.from('budget_items').update(patch).eq('id', item.id);
    if (error) fetchItems();
  }

  function neighbor(from: { id: string; field: EditableField }, dir: MoveDir, edited?: BudgetItem) {
    const rows = edited ? filteredItems.map((item) => (item.id === edited.id ? edited : item)) : filteredItems;
    let row = rows.findIndex((item) => item.id === from.id);
    let col = EDITABLE_FIELDS.indexOf(from.field);
    if (row < 0 || col < 0) return null;
    for (let step = 0; step < rows.length * EDITABLE_FIELDS.length; step += 1) {
      if (dir === 'down') row += 1;
      if (dir === 'up') row -= 1;
      if (dir === 'right') col += 1;
      if (dir === 'left') col -= 1;
      if (col >= EDITABLE_FIELDS.length) {
        col = 0;
        row += 1;
      }
      if (col < 0) {
        col = EDITABLE_FIELDS.length - 1;
        row -= 1;
      }
      if (row < 0 || row >= rows.length) return null;
      const field = EDITABLE_FIELDS[col];
      const lockedTotal = field === 'total_expense' && derivedTotal(moneyOrNull(rows[row].pax_count), moneyOrNull(rows[row].price_per_pax)) != null;
      if (!lockedTotal) return { id: rows[row].id, field };
    }
    return null;
  }

  function goTo(from: { id: string; field: EditableField }, dir: MoveDir, edited?: BudgetItem) {
    const next = neighbor(from, dir, edited);
    if (!next) {
      setActive(null);
      return;
    }
    const stored = items.find((item) => item.id === next.id);
    const nextItem = edited && edited.id === next.id ? edited : stored;
    setDraft(nextItem ? valueOf(nextItem, next.field) : '');
    setActive(next);
  }

  function openCell(item: BudgetItem, field: EditableField) {
    setDraft(valueOf(item, field));
    setActive({ id: item.id, field });
  }

  function commitActive() {
    if (!active) return;
    const item = items.find((row) => row.id === active.id);
    if (item && !CHOICE_FIELDS.has(active.field)) void commitField(item, active.field, draft);
    setActive(null);
  }

  function moveActive(dir: MoveDir) {
    if (!active) return;
    const item = items.find((row) => row.id === active.id);
    let edited: BudgetItem | undefined;
    if (item && !CHOICE_FIELDS.has(active.field)) {
      edited = rowAfterEdit(item, active.field, draft);
      void commitField(item, active.field, draft);
    }
    goTo(active, dir, edited);
  }

  function pickActive(value: string, dir?: MoveDir) {
    if (!active) return;
    const item = items.find((row) => row.id === active.id);
    if (item) void commitField(item, active.field, value);
    if (!dir) {
      setActive(null);
      return;
    }
    goTo(active, dir);
  }

  const filteredItems = (() => {
    let result = [...items];
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((item) =>
        [item.category, item.vendor, item.assignee, item.notes, paymentLabel(item.payment_method)]
          .join(' ')
          .toLowerCase()
          .includes(query),
      );
    }
    if (filterSide !== 'all') result = result.filter((item) => item.side === filterSide);
    if (filterCategory) result = result.filter((item) => item.category === filterCategory);
    if (filterPay === 'owing') result = result.filter((item) => remainingOf(item) > 0.004);
    else if (filterPay) result = result.filter((item) => item.status === filterPay);
    if (sortField) {
      const field = sortField;
      result.sort((a, b) => {
        const av = sortValue(a, field);
        const bv = sortValue(b, field);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  })();

  function toggleSort(field: BudgetSortField) {
    if (sortField === field) setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortHeading({ field, label, align, title }: { field: BudgetSortField; label: string; align: 'left' | 'right' | 'center'; title?: string }) {
    const icon = sortField !== field
      ? <ChevronsUpDown size={12} className="text-warm-gray-light/50" />
      : sortDir === 'asc'
        ? <ChevronUp size={12} className="text-gold" />
        : <ChevronDown size={12} className="text-gold" />;
    return (
      <th className={`py-3 px-2 text-xs font-semibold uppercase tracking-wider ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`} title={title}>
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className="inline-flex items-center gap-1 uppercase tracking-wider text-warm-gray hover:text-gold"
          style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', font: 'inherit', letterSpacing: 'inherit' }}
        >
          {label}
          {icon}
        </button>
      </th>
    );
  }

  const brideItems = items.filter((i) => i.side === 'bride');
  const groomItems = items.filter((i) => i.side === 'groom');

  const brideTotal = brideItems.reduce((s, i) => s + effectiveTotal(i), 0);
  const bridePaid = brideItems.reduce((s, i) => {
    if (i.status === 'settled') return s + effectiveTotal(i);
    return s + Number(i.advance_paid);
  }, 0);

  const groomTotal = groomItems.reduce((s, i) => s + effectiveTotal(i), 0);
  const groomPaid = groomItems.reduce((s, i) => {
    if (i.status === 'settled') return s + effectiveTotal(i);
    return s + Number(i.advance_paid);
  }, 0);

  const grandTotal = brideTotal + groomTotal;
  const grandPaid = bridePaid + groomPaid;

  function expectedSummary(rows: BudgetItem[]) {
    const quoted = rows.filter((item) => moneyOrNull(item.expected_budget) != null);
    const expected = quoted.reduce((sum, item) => sum + Number(item.expected_budget), 0);
    const actual = quoted.reduce((sum, item) => sum + effectiveTotal(item), 0);
    return { count: quoted.length, expected, diff: actual - expected };
  }

  const brideExpected = expectedSummary(brideItems);
  const groomExpected = expectedSummary(groomItems);
  const grandExpected = expectedSummary(items);

  function expectedLine(summary: { count: number; expected: number; diff: number }, totalCount: number) {
    if (summary.count === 0) return null;
    const over = summary.diff > 0.004;
    const under = summary.diff < -0.004;
    return (
      <p className="text-xs mt-1">
        <span className="text-warm-gray-light">
          Expected: {formatLKR(summary.expected)}
          {summary.count < totalCount ? ` (${summary.count} of ${totalCount})` : ''}
        </span>
        {over && <span className="text-red-600"> · Over {formatLKR(summary.diff)}</span>}
        {under && <span className="text-green-600"> · Under {formatLKR(Math.abs(summary.diff))}</span>}
        {!over && !under && <span className="text-warm-gray-light"> · On budget</span>}
      </p>
    );
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'settled':
        return <span className="status-badge status-settled">Settled</span>;
      case 'advance_paid':
        return <span className="status-badge status-advance-paid">Adv Paid</span>;
      default:
        return <span className="status-badge status-not-paid">Not Paid</span>;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold">Budget</h1>
          <p className="text-warm-gray-light text-sm mt-1">
            {filteredItems.length === items.length
              ? `${items.length} expenses tracked`
              : `${filteredItems.length} of ${items.length} expenses`}
          </p>
        </div>
        <button
          className="btn-gold flex items-center gap-2"
          onClick={() => {
            const opening = !showForm;
            setShowForm(opening);
            setEditId(null);
            setForm(emptyForm);
            if (opening) {
              setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }
          }}
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card border-l-4 border-l-pink-300">
          <h3 className="text-sm font-medium text-warm-gray mb-1">Bride&apos;s Side</h3>
          <p className="text-xl font-bold text-gold">{formatLKR(brideTotal)}</p>
          <p className="text-xs text-warm-gray-light mt-1">
            Paid: {formatLKR(bridePaid)} &middot; Remaining: {formatLKR(brideTotal - bridePaid)}
          </p>
          {expectedLine(brideExpected, brideItems.length)}
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-300 rounded-full transition-all"
              style={{ width: `${brideTotal > 0 ? (bridePaid / brideTotal) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="card border-l-4 border-l-blue-300">
          <h3 className="text-sm font-medium text-warm-gray mb-1">Groom&apos;s Side</h3>
          <p className="text-xl font-bold text-gold">{formatLKR(groomTotal)}</p>
          <p className="text-xs text-warm-gray-light mt-1">
            Paid: {formatLKR(groomPaid)} &middot; Remaining: {formatLKR(groomTotal - groomPaid)}
          </p>
          {expectedLine(groomExpected, groomItems.length)}
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-300 rounded-full transition-all"
              style={{ width: `${groomTotal > 0 ? (groomPaid / groomTotal) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="card border-l-4 border-l-gold">
          <h3 className="text-sm font-medium text-warm-gray mb-1">Grand Total</h3>
          <p className="text-xl font-bold text-gold">{formatLKR(grandTotal)}</p>
          <p className="text-xs text-warm-gray-light mt-1">
            Paid: {formatLKR(grandPaid)} &middot; Remaining: {formatLKR(grandTotal - grandPaid)}
          </p>
          {expectedLine(grandExpected, items.length)}
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all"
              style={{ width: `${grandTotal > 0 ? (grandPaid / grandTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="card mb-6 p-4">
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-light pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search vendor, category, assignee, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem', paddingRight: search ? '2rem' : '0.75rem' }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray-light hover:text-warm-gray z-10">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {(['all', 'bride', 'groom'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterSide === f
                  ? 'bg-gold text-white'
                  : 'bg-white text-warm-gray border border-ivory-dark hover:border-gold'
              }`}
              onClick={() => setFilterSide(f)}
            >
              {f === 'all' ? 'All' : f === 'bride' ? "Bride's Side" : "Groom's Side"}
            </button>
          ))}
          <div className="w-full sm:w-44">
            <Dropdown
              value={filterCategory || 'All categories'}
              options={['All categories', ...categories]}
              placeholder="All categories"
              onChange={(v) => setFilterCategory(v === 'All categories' ? '' : v)}
            />
          </div>
          <div className="w-full sm:w-44">
            <Dropdown
              value={payFilterLabel(filterPay)}
              options={['All payments', 'To be paid', 'Not paid', 'Advance paid', 'Settled']}
              onChange={(v) => setFilterPay(payFilterValue(v))}
            />
          </div>
          <div className="w-full sm:w-44 md:hidden">
            <Dropdown
              value={SORT_OPTIONS.find((option) => option.value === (sortField ?? ''))?.label ?? 'Default order'}
              options={SORT_OPTIONS.map((option) => option.label)}
              placeholder="Sort"
              onChange={(label) => {
                const match = SORT_OPTIONS.find((option) => option.label === label);
                setSortField(match?.value ? match.value : null);
              }}
            />
          </div>
          {sortField && (
            <button
              type="button"
              className="md:hidden px-3 py-1.5 rounded-full text-xs font-semibold border border-gold/40 text-gold"
              onClick={() => setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))}
            >
              {sortDir === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          )}
          {(search || filterCategory || filterPay || filterSide !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterCategory('');
                setFilterPay('');
                setFilterSide('all');
              }}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div ref={formRef} className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gold">
              {editId ? 'Edit Expense' : 'New Expense'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-warm-gray-light hover:text-warm-gray">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={saveItem}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Category *</label>
                <Dropdown
                  value={form.category}
                  options={categories}
                  onChange={(v) => setForm({ ...form, category: v })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Vendor</label>
                <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g., Enexus" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Expected Budget (LKR)</label>
                <input type="number" value={form.expected_budget} onChange={(e) => setForm({ ...form, expected_budget: e.target.value })} placeholder="Optional" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Pax / Items</label>
                <input type="number" value={form.pax_count} onChange={(e) => setForm((current) => formWithCount(current, { pax_count: e.target.value }))} placeholder="Optional" min="0" step="1" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Price per Pax (LKR)</label>
                <input type="number" value={form.price_per_pax} onChange={(e) => setForm((current) => formWithCount(current, { price_per_pax: e.target.value }))} placeholder="Optional" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Total Expense (LKR) *</label>
                <input
                  type="number"
                  value={form.total_expense}
                  onChange={(e) => setForm({ ...form, total_expense: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  readOnly={derivedTotal(optionalNumber(form.pax_count), optionalNumber(form.price_per_pax)) != null}
                />
                {derivedTotal(optionalNumber(form.pax_count), optionalNumber(form.price_per_pax)) != null && (
                  <p className="text-[11px] text-warm-gray-light mt-1">Pax × price per pax</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Payment Method</label>
                <Dropdown
                  value={paymentLabel(form.payment_method)}
                  options={['', 'Debit', 'Credit', 'Cash']}
                  placeholder="—"
                  onChange={(v) => setForm({ ...form, payment_method: PAYMENT_LABELS[v] ?? '' })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Advance Paid (LKR)</label>
                <input type="number" value={form.advance_paid} onChange={(e) => setForm({ ...form, advance_paid: e.target.value })} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Advance Date</label>
                <input type="date" value={form.advance_date} onChange={(e) => setForm({ ...form, advance_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Due Date / Paid Date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Status</label>
                <Dropdown
                  value={form.status === 'not_paid' ? 'Not Paid' : form.status === 'advance_paid' ? 'Advance Paid' : 'Settled'}
                  options={['Not Paid', 'Advance Paid', 'Settled']}
                  onChange={(v) => {
                    const map: Record<string, 'not_paid' | 'advance_paid' | 'settled'> = {
                      'Not Paid': 'not_paid', 'Advance Paid': 'advance_paid', 'Settled': 'settled'
                    };
                    setForm({ ...form, status: map[v] });
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Assignee</label>
                <input type="text" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="Who handles this?" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Side *</label>
                <Dropdown
                  value={form.side === 'bride' ? "Bride's Side" : "Groom's Side"}
                  options={["Groom's Side", "Bride's Side"]}
                  onChange={(v) => setForm({ ...form, side: v === "Bride's Side" ? 'bride' : 'groom' })}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-medium text-warm-gray mb-1">Notes</label>
                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="btn-gold">{editId ? 'Update' : 'Save Expense'}</button>
              <button type="button" className="btn-outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Budget Table */}
      {loading ? (
        <div className="text-center py-12 text-warm-gray-light">Loading budget...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-warm-gray-light">
          <p className="text-lg mb-2">{items.length === 0 ? 'No expenses yet' : 'No expenses match'}</p>
          <p className="text-sm">{items.length === 0 ? 'Start tracking your wedding budget!' : 'Try a different search or filter.'}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <p className="text-xs text-warm-gray-light mb-3">Click a cell to edit. Enter moves down, Tab moves across, Esc cancels. Total is pax × price when both are filled; otherwise type it. Diff and Remaining update on their own.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ivory-dark">
                <SortHeading field="category" label="Category" align="left" />
                <SortHeading field="vendor" label="Vendor" align="left" />
                <SortHeading field="expected" label="Expected" align="right" />
                <SortHeading field="total" label="Total" align="right" />
                <SortHeading field="diff" label="Diff" align="right" title="Total minus expected. Positive means over budget." />
                <SortHeading field="pax" label="Pax" align="right" title="Number of people, items, or units" />
                <SortHeading field="per_pax" label="Per Pax" align="right" />
                <SortHeading field="advance" label="Advance" align="right" />
                <SortHeading field="advance_date" label="Adv. Date" align="left" />
                <SortHeading field="remaining" label="Remaining" align="right" />
                <SortHeading field="due_date" label="Due Date" align="left" />
                <SortHeading field="payment" label="Payment" align="left" />
                <SortHeading field="status" label="Status" align="center" />
                <SortHeading field="assignee" label="Assignee" align="left" />
                <SortHeading field="side" label="Side" align="center" />
                <th className="text-center py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const total = effectiveTotal(item);
                const remaining = total - Number(item.advance_paid);
                const expected = moneyOrNull(item.expected_budget);
                const diff = expected == null ? null : total - expected;
                const pax = moneyOrNull(item.pax_count);
                const perPax = moneyOrNull(item.price_per_pax);
                const totalFromPax = derivedTotal(pax, perPax) != null;
                const categoryOptions = (categories.includes(item.category) ? categories : [item.category, ...categories])
                  .map((name) => ({ value: name, label: name }));
                const cell = (field: EditableField) => ({
                  active: active?.id === item.id && active.field === field,
                  draft,
                  onOpen: () => {
                    if (active?.id === item.id && active.field === field) setActive(null);
                    else openCell(item, field);
                  },
                  onDraft: setDraft,
                  onCommit: commitActive,
                  onCancel: () => setActive(null),
                  onMove: moveActive,
                  onPick: pickActive,
                });
                return (
                  <tr key={item.id} className="border-b border-ivory-dark/50 hover:bg-ivory/50 transition-colors">
                    <ExcelCell align="left" kind="choice" display={<span className="font-medium whitespace-nowrap">{item.category}</span>} options={categoryOptions} {...cell('category')} />
                    <ExcelCell align="left" kind="text" display={item.vendor || blank()} {...cell('vendor')} />
                    <ExcelCell align="right" kind="money" display={expected == null ? blank() : formatLKR(expected)} {...cell('expected_budget')} />
                    {totalFromPax ? (
                      <td className="sheet-td text-right whitespace-nowrap" title="Pax × price per pax">
                        <span className="font-medium">{formatLKR(total)}</span>
                      </td>
                    ) : (
                      <ExcelCell align="right" kind="money" display={<span className="font-medium whitespace-nowrap">{formatLKR(total)}</span>} {...cell('total_expense')} />
                    )}
                    <td className="sheet-td text-right whitespace-nowrap">
                      {diff == null ? (
                        blank()
                      ) : (
                        <span className={diff > 0.004 ? 'text-red-600 font-medium' : diff < -0.004 ? 'text-green-600 font-medium' : 'text-warm-gray-light'}>
                          {diff > 0.004 ? '+' : diff < -0.004 ? '−' : ''}
                          {formatLKR(Math.abs(diff))}
                        </span>
                      )}
                    </td>
                    <ExcelCell align="right" kind="count" display={pax == null ? blank() : pax.toLocaleString('en-LK')} {...cell('pax_count')} />
                    <ExcelCell align="right" kind="money" display={perPax == null ? blank() : formatLKR(perPax)} {...cell('price_per_pax')} />
                    <ExcelCell align="right" kind="money" display={formatLKR(Number(item.advance_paid))} {...cell('advance_paid')} />
                    <ExcelCell align="left" kind="date" display={formatDay(item.advance_date)} {...cell('advance_date')} />
                    <td className="sheet-td text-right whitespace-nowrap font-medium">
                      <span className={remaining > 0 ? 'text-red-600' : 'text-green-600'}>{formatLKR(remaining)}</span>
                    </td>
                    <ExcelCell align="left" kind="date" display={formatDay(item.due_date)} {...cell('due_date')} />
                    <ExcelCell align="left" kind="choice" display={paymentLabel(item.payment_method) || blank()} options={PAYMENT_OPTIONS} {...cell('payment_method')} />
                    <ExcelCell align="center" kind="choice" display={getStatusBadge(item.status)} options={STATUS_OPTIONS} {...cell('status')} />
                    <ExcelCell align="left" kind="text" display={item.assignee || blank()} {...cell('assignee')} />
                    <ExcelCell
                      align="center"
                      kind="choice"
                      options={SIDE_OPTIONS}
                      display={
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          item.side === 'bride' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.side === 'bride' ? 'Bride' : 'Groom'}
                        </span>
                      }
                      {...cell('side')}
                    />
                    <td className="sheet-td text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => startEdit(item)} className="p-1 text-warm-gray-light hover:text-gold transition-colors" title="Edit notes">
                          <Edit2 size={14} />
                        </button>
                        <button type="button" onClick={() => deleteItem(item.id)} className="p-1 text-warm-gray-light hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
