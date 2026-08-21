'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GuestItem, GUEST_CATEGORIES, attendingCount, invitedHeadcount } from '@/lib/types';
import {
  Plus, Trash2, Edit2, X, Check, Search, Send, Phone,
  ChevronsUpDown, ChevronUp, ChevronDown, Copy, Link2,
} from 'lucide-react';
import { inviteUrl, generateInviteToken, guestDisplayName, buildInviteShareMessage } from '@/lib/invite';
import Dropdown from '@/components/Dropdown';
import Select, { StylesConfig, SingleValue, components, DropdownIndicatorProps } from 'react-select';

type SelectOption = { value: string; label: string };

const pillSelectStyles = (active: boolean): StylesConfig<SelectOption, false> => ({
  control: (base, state) => ({
    ...base,
    minHeight: 30,
    height: 30,
    fontSize: '0.75rem',
    borderRadius: 9999,
    borderWidth: '1.5px',
    borderColor: active ? '#b8860b' : state.isFocused ? '#b8860b' : '#e8e0d8',
    backgroundColor: active ? 'rgba(184,134,11,0.1)' : 'white',
    boxShadow: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    '&:hover': { borderColor: '#b8860b' },
  }),
  valueContainer: (base) => ({ ...base, padding: '0 10px' }),
  singleValue: (base) => ({
    ...base,
    fontSize: '0.75rem',
    fontWeight: active ? 600 : 400,
    color: active ? '#b8860b' : '#6b5e57',
  }),
  placeholder: (base) => ({ ...base, color: '#9c8e85', fontSize: '0.75rem' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    padding: '0 8px 0 0',
    color: active ? '#b8860b' : '#9c8e85',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s',
  }),
  menu: (base) => ({
    ...base,
    fontSize: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #e0d8d0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    overflow: 'hidden',
    zIndex: 9999,
    minWidth: 160,
  }),
  menuList: (base) => ({ ...base, padding: 4 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.75rem',
    borderRadius: '0.375rem',
    padding: '6px 10px',
    backgroundColor: state.isSelected ? '#b8860b' : state.isFocused ? 'rgba(184,134,11,0.08)' : 'white',
    color: state.isSelected ? 'white' : '#3d3530',
    cursor: 'pointer',
    '&:active': { backgroundColor: '#b8860b', color: 'white' },
  }),
});

const PillDropdownIndicator = (props: DropdownIndicatorProps<SelectOption, false>) => (
  <components.DropdownIndicator {...props}>
    <ChevronDown size={12} />
  </components.DropdownIndicator>
);

function PillSelect({ value, options, onChange, placeholder, instanceId }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder: string;
  /** Required: react-select numbers its DOM ids from a module counter, which lands on
   *  different values during SSR and hydration. A stable id keeps the markup matching. */
  instanceId: string;
}) {
  const current = options.find((o) => o.value === value) ?? null;
  const active = !!value;
  return (
    <Select
      instanceId={instanceId}
      options={options}
      value={current}
      onChange={(opt: SingleValue<SelectOption>) => onChange(opt?.value ?? '')}
      styles={pillSelectStyles(active)}
      components={{ DropdownIndicator: PillDropdownIndicator }}
      isSearchable={false}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
      placeholder={placeholder}
    />
  );
}

function formatLKR(amount: number) {
  return 'Rs. ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

type GuestFormState = {
  /**
   * The whole name, entered as one field — entries are often "Mr & Mrs Abcd Fernando" rather
   * than a first/last pair. It saves into `first_name` with `last_name` blank; the DB keeps both
   * columns, and the invite site joins them with a space, so split and merged rows produce
   * identical display names and identical invite links.
   */
  name: string;
  side: 'bride' | 'groom';
  rsvp_status: 'pending' | 'confirmed' | 'declined';
  meal_preference: string;
  save_the_date_sent: boolean;
  invitation_sent: boolean;
  category: string;
  count: string;
  confirmed_count: string;
  address: string;
  gifted_amount: string;
};

const emptyForm: GuestFormState = {
  name: '',
  side: 'groom',
  rsvp_status: 'pending',
  meal_preference: '',
  save_the_date_sent: false,
  invitation_sent: false,
  category: '',
  count: '1',
  confirmed_count: '',
  address: '',
  gifted_amount: '0',
};

function itemToForm(item: GuestItem): GuestFormState {
  return {
    name: `${item.first_name} ${item.last_name}`.trim(),
    side: item.side,
    rsvp_status: item.rsvp_status,
    meal_preference: item.meal_preference,
    save_the_date_sent: item.save_the_date_sent,
    invitation_sent: item.invitation_sent,
    category: item.category,
    count: String(item.count),
    confirmed_count: item.confirmed_count == null ? '' : String(item.confirmed_count),
    address: item.address,
    gifted_amount: String(item.gifted_amount),
  };
}

type ModalState = { mode: 'add' } | { mode: 'edit'; id: string } | null;

export default function GuestListPage({ variant }: { variant: 'church' | 'cinnamon' }) {
  const isChurch = variant === 'church';
  const table = isChurch ? 'guest_items' : 'cinnamon_grand_guests';
  const title = isChurch ? 'Church Guests' : 'Cinnamon Grand Guests';
  const unitLabel = isChurch ? 'invited' : 'guests';
  const attendingLabel = isChurch ? 'attending' : 'confirmed';

  const [items, setItems] = useState<GuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<GuestFormState>(emptyForm);
  const [copiedId, setCopiedId] = useState('');
  const [inviteBusyId, setInviteBusyId] = useState('');
  const [rsvpBusyId, setRsvpBusyId] = useState('');
  const [filterSide, setFilterSide] = useState<'all' | 'bride' | 'groom'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRsvp, setFilterRsvp] = useState('');
  const [filterInvite, setFilterInvite] = useState('');
  const [searchName, setSearchName] = useState('');
  const [sortField, setSortField] = useState<keyof GuestItem | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  async function fetchItems() {
    const { data } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: true });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, []);

  // Keep the page behind the modal from scrolling while it is open.
  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [modal]);

  async function saveGuest(e: React.FormEvent) {
    e.preventDefault();
    const count = parseInt(form.count) || 1;

    // Attending only means anything for a confirmed guest, and it can never exceed the invite.
    // Guarding here stops the count being dropped below a headcount the guest already confirmed —
    // which would otherwise make the invitation site reject their own amendment.
    let confirmedCount: number | null = null;
    if (isChurch && form.rsvp_status === 'confirmed') {
      const parsed = parseInt(form.confirmed_count);
      confirmedCount = Number.isNaN(parsed) ? count : parsed;
      if (confirmedCount < 1 || confirmedCount > count) {
        alert(
          `Attending must be between 1 and the invited count (${count}).\n\n` +
            `To invite fewer people than have already confirmed, lower Attending first.`
        );
        return;
      }
    }

    const row: Record<string, unknown> = {
      first_name: form.name.trim(),
      last_name: '',
      side: form.side,
      rsvp_status: form.rsvp_status,
      meal_preference: form.meal_preference.trim(),
      save_the_date_sent: form.save_the_date_sent,
      invitation_sent: form.invitation_sent,
      category: form.category,
      count,
      address: form.address.trim(),
      gifted_amount: parseFloat(form.gifted_amount) || 0,
    };
    // cinnamon_grand_guests has no confirmed_count column.
    if (isChurch) row.confirmed_count = confirmedCount;

    if (modal && modal.mode === 'edit') {
      const { error } = await supabase.from(table).update(row).eq('id', modal.id);
      if (error) {
        alert(`Unable to save guest: ${error.message}`);
        return;
      }
    } else if (isChurch) {
      // invite_token is UNIQUE, so retry the (very unlikely) collision rather than failing the add.
      for (let attempt = 0; ; attempt++) {
        const { error } = await supabase
          .from(table)
          .insert({ ...row, invite_token: generateInviteToken() });
        if (!error) break;
        if (error.code !== '23505' || attempt >= 2) {
          alert(`Unable to add guest: ${error.message}`);
          return;
        }
      }
    } else {
      const { error } = await supabase.from(table).insert(row);
      if (error) {
        alert(`Unable to add guest: ${error.message}`);
        return;
      }
    }

    setModal(null);
    setForm(emptyForm);
    fetchItems();
  }

  /** One-tap toggle so marking an invitation sent doesn't require opening the editor. */
  async function toggleInvitationSent(item: GuestItem) {
    const next = !item.invitation_sent;
    setInviteBusyId(item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, invitation_sent: next } : i)));
    const { error } = await supabase.from(table).update({ invitation_sent: next }).eq('id', item.id);
    setInviteBusyId('');
    if (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, invitation_sent: !next } : i)));
      alert(`Unable to update invitation status: ${error.message}`);
    }
  }

  /**
   * Cinnamon Grand invitations happen over the phone, so RSVP is a one-tap action there.
   * The table has no confirmed_count — a confirmed row counts its full `count` as attending.
   */
  async function updateRsvp(item: GuestItem, next: GuestItem['rsvp_status']) {
    const prevStatus = item.rsvp_status;
    setRsvpBusyId(item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, rsvp_status: next } : i)));
    const { error } = await supabase.from(table).update({ rsvp_status: next }).eq('id', item.id);
    setRsvpBusyId('');
    if (error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, rsvp_status: prevStatus } : i)));
      alert(`Unable to update RSVP: ${error.message}`);
    }
  }

  /** Backfill a token for rows created before the planner started issuing them. */
  async function createInviteLink(item: GuestItem) {
    for (let attempt = 0; ; attempt++) {
      const { error } = await supabase
        .from(table)
        .update({ invite_token: generateInviteToken() })
        .eq('id', item.id);
      if (!error) break;
      if (error.code !== '23505' || attempt >= 2) {
        alert(`Unable to create link: ${error.message}`);
        return;
      }
    }
    fetchItems();
  }

  async function copyInviteLink(item: GuestItem) {
    const url = inviteUrl(item.first_name, item.last_name, item.invite_token);
    if (!url) return;
    const message = buildInviteShareMessage(
      guestDisplayName(item.first_name, item.last_name),
      url
    );
    await navigator.clipboard.writeText(message);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(''), 2000);
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this guest?')) return;
    await supabase.from(table).delete().eq('id', id);
    fetchItems();
  }

  // NEXT_PUBLIC_* is inlined at build time, so this is a constant for the deployed bundle.
  const inviteBaseConfigured = Boolean(process.env.NEXT_PUBLIC_INVITE_URL);
  const missingTokens = isChurch ? items.filter((i) => !i.invite_token).length : 0;

  const brideItems = items.filter((i) => i.side === 'bride');
  const groomItems = items.filter((i) => i.side === 'groom');

  const brideTotal = brideItems.reduce((s, i) => s + invitedHeadcount(i), 0);
  const brideConfirmed = brideItems.reduce((s, i) => s + attendingCount(i), 0);
  const bridePending = brideItems.filter((i) => i.rsvp_status === 'pending').reduce((s, i) => s + invitedHeadcount(i), 0);
  const brideDeclined = brideItems.filter((i) => i.rsvp_status === 'declined').reduce((s, i) => s + invitedHeadcount(i), 0);
  const brideGifted = brideItems.reduce((s, i) => s + Number(i.gifted_amount), 0);

  const groomTotal = groomItems.reduce((s, i) => s + invitedHeadcount(i), 0);
  const groomConfirmed = groomItems.reduce((s, i) => s + attendingCount(i), 0);
  const groomPending = groomItems.filter((i) => i.rsvp_status === 'pending').reduce((s, i) => s + invitedHeadcount(i), 0);
  const groomDeclined = groomItems.filter((i) => i.rsvp_status === 'declined').reduce((s, i) => s + invitedHeadcount(i), 0);
  const groomGifted = groomItems.reduce((s, i) => s + Number(i.gifted_amount), 0);

  const grandTotal = brideTotal + groomTotal;
  const grandConfirmed = brideConfirmed + groomConfirmed;
  const grandPending = bridePending + groomPending;
  const grandDeclined = brideDeclined + groomDeclined;
  const grandGifted = brideGifted + groomGifted;

  function toggleSort(field: keyof GuestItem) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: keyof GuestItem }) {
    if (sortField !== field) return <ChevronsUpDown size={12} className="text-warm-gray-light/50 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-gold ml-1 inline" />
      : <ChevronDown size={12} className="text-gold ml-1 inline" />;
  }

  const activeFilterCount = [filterCategory, filterRsvp, filterInvite, searchName].filter(Boolean).length
    + (filterSide !== 'all' ? 1 : 0);

  const filteredItems = (() => {
    let result = [...items];

    if (searchName.trim()) {
      const q = searchName.toLowerCase();
      result = result.filter((i) =>
        `${i.first_name} ${i.last_name}`.toLowerCase().includes(q)
      );
    }
    if (filterSide !== 'all') result = result.filter((i) => i.side === filterSide);
    if (filterCategory) result = result.filter((i) => i.category === filterCategory);
    if (filterRsvp) result = result.filter((i) => i.rsvp_status === filterRsvp);
    if (filterInvite) result = result.filter((i) => i.invitation_sent === (filterInvite === 'yes'));

    if (sortField) {
      result.sort((a, b) => {
        const av = a[sortField];
        const bv = b[sortField];
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  })();

  function fullName(item: GuestItem) {
    return `${item.first_name} ${item.last_name}`.trim();
  }

  function rsvpBadge(status: string) {
    if (status === 'confirmed') return <span className="status-badge status-confirmed">Confirmed</span>;
    if (status === 'declined') return <span className="status-badge status-declined">Declined</span>;
    return <span className="status-badge status-pending">Pending</span>;
  }

  function inviteToggle(item: GuestItem, size: 'table' | 'card') {
    const sent = item.invitation_sent;
    const busy = inviteBusyId === item.id;
    const sizing = size === 'card'
      ? 'px-3.5 py-2 text-xs'
      : 'px-2.5 py-1 text-xs';
    return (
      <button
        type="button"
        onClick={() => toggleInvitationSent(item)}
        disabled={busy}
        title={sent ? 'Invitation sent — tap to undo' : 'Mark invitation as sent'}
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors disabled:opacity-50 ${sizing} ${
          sent
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-white border-[1.5px] border-gold/50 text-gold hover:bg-gold/10'
        }`}
      >
        {sent ? <Check size={13} /> : <Send size={13} />}
        {sent ? (size === 'card' ? 'Invite sent' : 'Sent') : 'Mark sent'}
      </button>
    );
  }

  /** CG only: tappable RSVP — Confirm or a small ✗ to decline; the current state taps back to pending. */
  function confirmToggle(item: GuestItem, size: 'table' | 'card') {
    const busy = rsvpBusyId === item.id;
    const sizing = size === 'card' ? 'px-3.5 py-2 text-xs' : 'px-2.5 py-1 text-xs';
    const pill = 'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors disabled:opacity-50';

    if (item.rsvp_status === 'declined') {
      return (
        <button
          type="button"
          onClick={() => updateRsvp(item, 'pending')}
          disabled={busy}
          title="Declined — tap to undo"
          className={`${pill} ${sizing} bg-red-100 text-red-700 hover:bg-red-200`}
        >
          <X size={13} /> Declined
        </button>
      );
    }

    const confirmed = item.rsvp_status === 'confirmed';
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => updateRsvp(item, confirmed ? 'pending' : 'confirmed')}
          disabled={busy}
          title={confirmed ? 'Confirmed — tap to undo' : 'Confirmed over the phone? Tap to mark'}
          className={`${pill} ${sizing} ${
            confirmed
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-white border-[1.5px] border-green-600/40 text-green-700 hover:bg-green-50'
          }`}
        >
          {confirmed ? <Check size={13} /> : <Phone size={13} />}
          {confirmed ? 'Confirmed' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => updateRsvp(item, 'declined')}
          disabled={busy}
          title="Declined over the phone? Tap to mark"
          aria-label="Mark as declined"
          className={`rounded-full border-[1.5px] border-red-200 bg-white text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ${size === 'card' ? 'p-2' : 'p-1'}`}
        >
          <X size={size === 'card' ? 14 : 12} />
        </button>
      </span>
    );
  }

  function openEdit(item: GuestItem) {
    setForm(itemToForm(item));
    setModal({ mode: 'edit', id: item.id });
  }

  function copyOrCreateButton(item: GuestItem, iconSize: number, boxed: boolean) {
    const cls = boxed
      ? 'p-2 rounded-lg bg-ivory-dark/40 text-warm-gray hover:text-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
      : 'text-warm-gray-light hover:text-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
    return item.invite_token ? (
      <button
        type="button"
        onClick={() => copyInviteLink(item)}
        disabled={!inviteBaseConfigured}
        title={
          inviteBaseConfigured
            ? 'Copy invite message with personal link'
            : 'Set NEXT_PUBLIC_INVITE_URL to enable invite links'
        }
        aria-label="Copy invite link"
        className={cls}
      >
        {copiedId === item.id ? <Check size={iconSize} className="text-green-600" /> : <Copy size={iconSize} />}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => createInviteLink(item)}
        title="No invite link yet — create one"
        aria-label="Create invite link"
        className={cls}
      >
        <Link2 size={iconSize} />
      </button>
    );
  }

  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

  const columns: { label: string; field: keyof GuestItem; align: keyof typeof alignClass }[] = [
    { label: 'Name', field: 'first_name', align: 'left' },
    { label: isChurch ? 'Invited' : 'Count', field: 'count', align: 'center' },
    ...(isChurch ? [{ label: 'Gifted', field: 'gifted_amount' as keyof GuestItem, align: 'right' as const }] : []),
    { label: 'RSVP', field: 'rsvp_status', align: 'left' },
    ...(isChurch ? [{ label: 'Attending', field: 'confirmed_count' as keyof GuestItem, align: 'center' as const }] : []),
    { label: 'Invite', field: 'invitation_sent', align: 'center' },
    { label: 'Side', field: 'side', align: 'left' },
  ];

  const modalField = (label: string, node: React.ReactNode, span2 = false) => (
    <div className={span2 ? 'sm:col-span-2' : undefined}>
      <label className="block text-xs font-medium text-warm-gray mb-1">{label}</label>
      {node}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold">{title}</h1>
          <p className="text-warm-gray-light text-sm mt-1">
            {items.length} entries · {grandTotal} {unitLabel} · {grandConfirmed} {attendingLabel}
          </p>
        </div>
        <button
          className="btn-gold flex items-center gap-2"
          onClick={() => { setForm(emptyForm); setModal({ mode: 'add' }); }}
        >
          <Plus size={16} /> Add Guest
        </button>
      </div>

      {isChurch && !inviteBaseConfigured && (
        <div className="card mb-6 border-amber-200 bg-amber-50/60">
          <p className="text-sm text-warm-gray">
            <span className="font-semibold text-gold">Invite links are disabled.</span>{' '}
            Set <code className="text-xs">NEXT_PUBLIC_INVITE_URL</code> (the invitation site&apos;s
            address) in this app&apos;s environment to copy personal links from here.
          </p>
        </div>
      )}

      {isChurch && inviteBaseConfigured && missingTokens > 0 && (
        <div className="card mb-6 border-amber-200 bg-amber-50/60">
          <p className="text-sm text-warm-gray">
            <span className="font-semibold text-gold">{missingTokens}</span> guest
            {missingTokens === 1 ? ' has' : 's have'} no invite link yet. Use the{' '}
            <Link2 size={13} className="inline text-warm-gray-light" /> button on their entry to
            create one.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {([
          { heading: "Bride's Side", total: brideTotal, confirmed: brideConfirmed, pending: bridePending, declined: brideDeclined, gifted: brideGifted, giftedLabel: 'Gifted' },
          { heading: "Groom's Side", total: groomTotal, confirmed: groomConfirmed, pending: groomPending, declined: groomDeclined, gifted: groomGifted, giftedLabel: 'Gifted' },
          { heading: 'Grand Total', total: grandTotal, confirmed: grandConfirmed, pending: grandPending, declined: grandDeclined, gifted: grandGifted, giftedLabel: 'Total Gifted' },
        ]).map((c) => (
          <div key={c.heading} className="card">
            <h3 className="text-sm font-semibold text-warm-gray-light uppercase tracking-wide mb-3">{c.heading}</h3>
            <p className="text-2xl font-bold text-gold mb-1">{c.total} {unitLabel}</p>
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              <span className="status-badge status-confirmed">{c.confirmed} {attendingLabel}</span>
              <span className="status-badge status-pending">{c.pending} pending</span>
              <span className="status-badge status-declined">{c.declined} declined</span>
            </div>
            <p className="text-sm text-warm-gray">{c.giftedLabel}: <span className="font-semibold text-gold">{formatLKR(c.gifted)}</span></p>
            <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full transition-all" style={{ width: c.total > 0 ? `${(c.confirmed / c.total) * 100}%` : '0%' }} />
            </div>
            <p className="text-xs text-warm-gray-light mt-1">{c.total > 0 ? Math.round((c.confirmed / c.total) * 100) : 0}% {attendingLabel}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="card mb-6 p-4">
        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-light pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ paddingLeft: '2.25rem', paddingRight: searchName ? '2rem' : '0.75rem' }}
            className="py-2 text-sm border border-[#e0d8d0] rounded-lg w-full focus:outline-none focus:border-gold focus:shadow-[0_0_0_2px_rgba(184,134,11,0.1)] bg-white"
          />
          {searchName && (
            <button onClick={() => setSearchName('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray-light hover:text-warm-gray z-10">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Side pills */}
          {(['all', 'bride', 'groom'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSide(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterSide === s
                  ? 'bg-gold text-white'
                  : 'bg-white text-warm-gray border border-ivory-dark hover:border-gold hover:text-gold'
              }`}
            >
              {s === 'all' ? 'All' : s === 'bride' ? "Bride's" : "Groom's"}
            </button>
          ))}

          <div className="w-px h-5 bg-ivory-dark mx-1" />

          <PillSelect
            instanceId="filter-category"
            value={filterCategory}
            onChange={setFilterCategory}
            placeholder="All Categories"
            options={[{ value: '', label: 'All Categories' }, ...GUEST_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <PillSelect
            instanceId="filter-rsvp"
            value={filterRsvp}
            onChange={setFilterRsvp}
            placeholder="All RSVP"
            options={[
              { value: '', label: 'All RSVP' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'declined', label: 'Declined' },
            ]}
          />
          <PillSelect
            instanceId="filter-invite"
            value={filterInvite}
            onChange={setFilterInvite}
            placeholder="Invite"
            options={[
              { value: '', label: 'Invite: All' },
              { value: 'yes', label: 'Invite: Sent' },
              { value: 'no', label: 'Invite: Not Sent' },
            ]}
          />

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilterSide('all'); setFilterCategory(''); setFilterRsvp(''); setFilterInvite(''); setSearchName(''); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors ml-auto"
            >
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs text-warm-gray-light mt-2">
          Showing {filteredItems.length} of {items.length} entries
          {filteredItems.length !== items.length && (
            <span className="text-gold font-medium">
              {' '}· {filteredItems.reduce((s, i) => s + invitedHeadcount(i), 0)} {unitLabel}
              {' '}· {filteredItems.reduce((s, i) => s + attendingCount(i), 0)} {attendingLabel}
            </span>
          )}
        </p>
      </div>

      {/* Guest list */}
      {loading ? (
        <div className="text-center py-12 text-warm-gray-light">Loading guests...</div>
      ) : filteredItems.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-warm-gray-light">{items.length === 0 ? 'No guests yet. Add your first guest above.' : 'No guests match your filters.'}</p>
        </div>
      ) : (
        <>
          {/* Phone: card list */}
          <div className="md:hidden space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-warm-gray leading-snug">{fullName(item)}</p>
                    {item.meal_preference && (
                      <p className="text-xs text-warm-gray-light mt-0.5">{item.meal_preference}</p>
                    )}
                  </div>
                  {rsvpBadge(item.rsvp_status)}
                </div>
                <p className="text-xs text-warm-gray-light mt-2">
                  <span className={`font-medium ${item.side === 'bride' ? 'text-blush-dark' : 'text-sage'}`}>
                    {item.side === 'bride' ? "Bride's" : "Groom's"}
                  </span>
                  {' '}· {item.count} {isChurch ? 'invited' : item.count === 1 ? 'guest' : 'guests'}
                  {isChurch && item.rsvp_status === 'confirmed' && (
                    <> · {attendingCount(item)} attending</>
                  )}
                  {isChurch && item.gifted_amount > 0 && <> · {formatLKR(Number(item.gifted_amount))}</>}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-ivory-dark">
                  {!isChurch && confirmToggle(item, 'card')}
                  {inviteToggle(item, 'card')}
                  <div className="ml-auto flex items-center gap-1.5">
                    {isChurch && copyOrCreateButton(item, 17, true)}
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      title="Edit guest"
                      aria-label="Edit guest"
                      className="p-2 rounded-lg bg-gold/15 text-gold hover:bg-gold/25 transition-colors"
                    >
                      <Edit2 size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      title="Delete guest"
                      aria-label="Delete guest"
                      className="p-2 rounded-lg bg-ivory-dark/40 text-warm-gray-light hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ivory-dark">
                  {columns.map(({ label, field, align }) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className={`px-4 py-3 text-xs font-semibold text-warm-gray-light uppercase tracking-wide cursor-pointer hover:text-gold select-none transition-colors ${alignClass[align]}`}
                    >
                      {label}<SortIcon field={field} />
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, i) => (
                  <tr
                    key={item.id}
                    className={`border-b border-ivory-dark last:border-0 ${i % 2 === 0 ? '' : 'bg-ivory/40'}`}
                  >
                    <td className="px-4 py-3 min-w-[11rem]">
                      <div className="font-medium text-warm-gray leading-snug">{fullName(item)}</div>
                      {item.meal_preference && (
                        <span className="block text-xs text-warm-gray-light mt-0.5">{item.meal_preference}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-warm-gray">{item.count}</td>
                    {isChurch && (
                      <td className="px-4 py-3 text-right text-warm-gray whitespace-nowrap">
                        {item.gifted_amount > 0 ? formatLKR(Number(item.gifted_amount)) : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {isChurch ? rsvpBadge(item.rsvp_status) : confirmToggle(item, 'table')}
                    </td>
                    {isChurch && (
                      <td className="px-4 py-3 text-center font-semibold text-warm-gray">
                        {item.rsvp_status === 'confirmed' ? (item.confirmed_count ?? item.count) : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">{inviteToggle(item, 'table')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${item.side === 'bride' ? 'text-blush-dark' : 'text-sage'}`}>
                        {item.side === 'bride' ? "Bride's" : "Groom's"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {isChurch && copyOrCreateButton(item, 14, false)}
                        <button
                          onClick={() => openEdit(item)}
                          title="Edit guest"
                          aria-label="Edit guest"
                          className="text-warm-gray-light hover:text-gold transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          title="Delete guest"
                          aria-label="Delete guest"
                          className="text-warm-gray-light hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add / Edit modal — bottom sheet on phones, centered dialog on larger screens */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <form
            onSubmit={saveGuest}
            className="guest-modal relative w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ivory-dark shrink-0">
              <h3 className="text-lg font-semibold text-gold">
                {modal.mode === 'add' ? 'New Guest' : 'Edit Guest'}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                aria-label="Close"
                className="p-2 -mr-2 text-warm-gray-light hover:text-warm-gray"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {modalField('Name *', (
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Mr &amp; Mrs Abcd Fernando"
                  />
                ), true)}
                {modalField('Side', (
                  <Dropdown
                    options={["Bride's Side", "Groom's Side"]}
                    value={form.side === 'bride' ? "Bride's Side" : "Groom's Side"}
                    onChange={(v) => setForm({ ...form, side: v === "Bride's Side" ? 'bride' : 'groom' })}
                  />
                ))}
                {modalField('Category', (
                  <Dropdown
                    options={['', ...GUEST_CATEGORIES]}
                    value={form.category}
                    onChange={(v) => setForm({ ...form, category: v })}
                  />
                ))}
                {modalField('RSVP Status', (
                  <Dropdown
                    options={['pending', 'confirmed', 'declined']}
                    value={form.rsvp_status}
                    onChange={(v) => setForm({ ...form, rsvp_status: v as GuestFormState['rsvp_status'] })}
                  />
                ))}
                {modalField(isChurch ? 'Invited count' : 'Count (# of people)', (
                  <input
                    type="number"
                    min="0"
                    value={form.count}
                    onChange={(e) => setForm({ ...form, count: e.target.value })}
                  />
                ))}
                {isChurch && form.rsvp_status === 'confirmed' && modalField('Attending', (
                  <input
                    type="number"
                    min="1"
                    placeholder={form.count}
                    value={form.confirmed_count}
                    onChange={(e) => setForm({ ...form, confirmed_count: e.target.value })}
                  />
                ))}
                {modalField('Gifted Amount (Rs.)', (
                  <input
                    type="number"
                    min="0"
                    value={form.gifted_amount}
                    onChange={(e) => setForm({ ...form, gifted_amount: e.target.value })}
                  />
                ))}
                {modalField('Meal Preference', (
                  <input
                    type="text"
                    value={form.meal_preference}
                    onChange={(e) => setForm({ ...form, meal_preference: e.target.value })}
                    placeholder="e.g. Vegetarian"
                  />
                ))}
                {modalField('Address', (
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                ), true)}
                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-gold shrink-0"
                      checked={form.save_the_date_sent}
                      onChange={(e) => setForm({ ...form, save_the_date_sent: e.target.checked })}
                    />
                    <span className="text-sm text-warm-gray">Save the Date sent</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-gold shrink-0"
                      checked={form.invitation_sent}
                      onChange={(e) => setForm({ ...form, invitation_sent: e.target.checked })}
                    />
                    <span className="text-sm text-warm-gray">Invitation sent</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-ivory-dark shrink-0">
              <button type="submit" className="btn-gold flex-1">
                {modal.mode === 'add' ? 'Save Guest' : 'Save Changes'}
              </button>
              <button type="button" className="btn-outline flex-1" onClick={() => setModal(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
