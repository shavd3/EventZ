'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GuestItem, GUEST_CATEGORIES } from '@/lib/types';
import { Plus, Trash2, Edit2, X, Check, Search, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import Dropdown from '@/components/Dropdown';
import Select, { StylesConfig, SingleValue, components, DropdownIndicatorProps } from 'react-select';
import { ChevronDown as ChevronDownIcon } from 'lucide-react';

type SelectOption = { value: string; label: string };

const inlineSelectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 30,
    height: 30,
    fontSize: '0.75rem',
    borderRadius: '0.375rem',
    borderColor: state.isFocused ? '#b8860b' : '#e0d8d0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(184,134,11,0.15)' : 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    '&:hover': { borderColor: '#b8860b' },
  }),
  valueContainer: (base) => ({ ...base, padding: '0 8px' }),
  singleValue: (base) => ({ ...base, color: '#3d3530', fontSize: '0.75rem' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    padding: '0 6px',
    color: '#9c8e85',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0)',
    transition: 'transform 0.2s',
  }),
  menu: (base) => ({
    ...base,
    fontSize: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #e0d8d0',
    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuList: (base) => ({ ...base, padding: 4 }),
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
  placeholder: (base) => ({ ...base, color: '#9c8e85', fontSize: '0.75rem' }),
};

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
    <ChevronDownIcon size={12} />
  </components.DropdownIndicator>
);

function PillSelect({ value, options, onChange, placeholder }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const current = options.find((o) => o.value === value) ?? null;
  const active = !!value;
  return (
    <Select
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

type GuestForm = {
  first_name: string;
  last_name: string;
  side: 'bride' | 'groom';
  rsvp_status: 'pending' | 'confirmed' | 'declined';
  meal_preference: string;
  save_the_date_sent: boolean;
  invitation_sent: boolean;
  category: string;
  count: string;
  address: string;
  gifted_amount: string;
};

const emptyForm: GuestForm = {
  first_name: '',
  last_name: '',
  side: 'groom',
  rsvp_status: 'pending',
  meal_preference: '',
  save_the_date_sent: false,
  invitation_sent: false,
  category: '',
  count: '1',
  address: '',
  gifted_amount: '0',
};

function itemToForm(item: GuestItem): GuestForm {
  return {
    first_name: item.first_name,
    last_name: item.last_name,
    side: item.side,
    rsvp_status: item.rsvp_status,
    meal_preference: item.meal_preference,
    save_the_date_sent: item.save_the_date_sent,
    invitation_sent: item.invitation_sent,
    category: item.category,
    count: String(item.count),
    address: item.address,
    gifted_amount: String(item.gifted_amount),
  };
}

export default function GuestsPage() {
  const [items, setItems] = useState<GuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addForm, setAddForm] = useState<GuestForm>(emptyForm);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState<GuestForm>(emptyForm);
  const [filterSide, setFilterSide] = useState<'all' | 'bride' | 'groom'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRsvp, setFilterRsvp] = useState('');
  const [filterSaveDate, setFilterSaveDate] = useState('');
  const [filterInvite, setFilterInvite] = useState('');
  const [searchName, setSearchName] = useState('');
  const [sortField, setSortField] = useState<keyof GuestItem | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const formRef = useRef<HTMLDivElement>(null);

  async function fetchItems() {
    const { data } = await supabase
      .from('guest_items')
      .select('*')
      .order('created_at', { ascending: true });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, []);

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('guest_items').insert({
      first_name: addForm.first_name.trim(),
      last_name: addForm.last_name.trim(),
      side: addForm.side,
      rsvp_status: addForm.rsvp_status,
      meal_preference: addForm.meal_preference.trim(),
      save_the_date_sent: addForm.save_the_date_sent,
      invitation_sent: addForm.invitation_sent,
      category: addForm.category,
      count: parseInt(addForm.count) || 1,
      address: addForm.address.trim(),
      gifted_amount: parseFloat(addForm.gifted_amount) || 0,
    });
    setAddForm(emptyForm);
    setShowForm(false);
    fetchItems();
  }

  async function saveInline(id: string) {
    await supabase.from('guest_items').update({
      first_name: inlineForm.first_name.trim(),
      last_name: inlineForm.last_name.trim(),
      side: inlineForm.side,
      rsvp_status: inlineForm.rsvp_status,
      meal_preference: inlineForm.meal_preference.trim(),
      save_the_date_sent: inlineForm.save_the_date_sent,
      invitation_sent: inlineForm.invitation_sent,
      category: inlineForm.category,
      count: parseInt(inlineForm.count) || 1,
      address: inlineForm.address.trim(),
      gifted_amount: parseFloat(inlineForm.gifted_amount) || 0,
    }).eq('id', id);
    setInlineEditId(null);
    fetchItems();
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this guest?')) return;
    await supabase.from('guest_items').delete().eq('id', id);
    fetchItems();
  }

  const brideItems = items.filter((i) => i.side === 'bride');
  const groomItems = items.filter((i) => i.side === 'groom');

  const brideTotal = brideItems.reduce((s, i) => s + i.count, 0);
  const brideConfirmed = brideItems.filter((i) => i.rsvp_status === 'confirmed').reduce((s, i) => s + i.count, 0);
  const bridePending = brideItems.filter((i) => i.rsvp_status === 'pending').reduce((s, i) => s + i.count, 0);
  const brideDeclined = brideItems.filter((i) => i.rsvp_status === 'declined').reduce((s, i) => s + i.count, 0);
  const brideGifted = brideItems.reduce((s, i) => s + Number(i.gifted_amount), 0);

  const groomTotal = groomItems.reduce((s, i) => s + i.count, 0);
  const groomConfirmed = groomItems.filter((i) => i.rsvp_status === 'confirmed').reduce((s, i) => s + i.count, 0);
  const groomPending = groomItems.filter((i) => i.rsvp_status === 'pending').reduce((s, i) => s + i.count, 0);
  const groomDeclined = groomItems.filter((i) => i.rsvp_status === 'declined').reduce((s, i) => s + i.count, 0);
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

  const activeFilterCount = [filterCategory, filterRsvp, filterSaveDate, filterInvite, searchName].filter(Boolean).length
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
    if (filterSaveDate) result = result.filter((i) => i.save_the_date_sent === (filterSaveDate === 'yes'));
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

  function rsvpBadge(status: string) {
    if (status === 'confirmed') return <span className="status-badge status-confirmed">Confirmed</span>;
    if (status === 'declined') return <span className="status-badge status-declined">Declined</span>;
    return <span className="status-badge status-pending">Pending</span>;
  }

  function boolBadge(val: boolean) {
    return val
      ? <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold"><Check size={12} /> Yes</span>
      : <span className="text-warm-gray-light text-xs">No</span>;
  }

  const iStyle = "w-full px-2 py-1.5 text-xs border border-[#e0d8d0] rounded-md bg-white text-[#3d3530] focus:outline-none focus:border-gold focus:shadow-[0_0_0_2px_rgba(184,134,11,0.12)] transition-colors";

  const inlineInput = (field: keyof GuestForm, type = 'text', placeholder = '') => (
    <input
      type={type}
      placeholder={placeholder}
      value={inlineForm[field] as string}
      onChange={(e) => setInlineForm({ ...inlineForm, [field]: e.target.value })}
      className={iStyle}
    />
  );

  const inlineSelect = (field: keyof GuestForm, options: string[]) => {
    const opts: SelectOption[] = options.map((o) => ({ value: o, label: o || '—' }));
    const current = opts.find((o) => o.value === inlineForm[field]) ?? null;
    return (
      <Select
        options={opts}
        value={current}
        onChange={(opt: SingleValue<SelectOption>) => setInlineForm({ ...inlineForm, [field]: opt?.value ?? '' })}
        styles={inlineSelectStyles}
        isSearchable={false}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuPosition="fixed"
      />
    );
  };

  const inlineCheck = (field: 'save_the_date_sent' | 'invitation_sent') => (
    <label className="flex flex-col items-center gap-1 cursor-pointer">
      <input
        type="checkbox"
        checked={inlineForm[field]}
        onChange={(e) => setInlineForm({ ...inlineForm, [field]: e.target.checked })}
        className="w-4 h-4 accent-gold"
      />
      <span className={`text-[10px] font-medium ${inlineForm[field] ? 'text-green-700' : 'text-warm-gray-light'}`}>
        {inlineForm[field] ? 'Yes' : 'No'}
      </span>
    </label>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold">Guest List</h1>
          <p className="text-warm-gray-light text-sm mt-1">{items.length} entries · {grandTotal} guests total</p>
        </div>
        <button
          className="btn-gold flex items-center gap-2"
          onClick={() => {
            const opening = !showForm;
            setShowForm(opening);
            setAddForm(emptyForm);
            if (opening) {
              setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            }
          }}
        >
          <Plus size={16} /> Add Guest
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-warm-gray-light uppercase tracking-wide mb-3">Bride&apos;s Side</h3>
          <p className="text-2xl font-bold text-gold mb-1">{brideTotal} guests</p>
          <div className="flex flex-wrap gap-2 text-xs mb-3">
            <span className="status-badge status-confirmed">{brideConfirmed} confirmed</span>
            <span className="status-badge status-pending">{bridePending} pending</span>
            <span className="status-badge status-declined">{brideDeclined} declined</span>
          </div>
          <p className="text-sm text-warm-gray">Gifted: <span className="font-semibold text-gold">{formatLKR(brideGifted)}</span></p>
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all" style={{ width: brideTotal > 0 ? `${(brideConfirmed / brideTotal) * 100}%` : '0%' }} />
          </div>
          <p className="text-xs text-warm-gray-light mt-1">{brideTotal > 0 ? Math.round((brideConfirmed / brideTotal) * 100) : 0}% confirmed</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-warm-gray-light uppercase tracking-wide mb-3">Groom&apos;s Side</h3>
          <p className="text-2xl font-bold text-gold mb-1">{groomTotal} guests</p>
          <div className="flex flex-wrap gap-2 text-xs mb-3">
            <span className="status-badge status-confirmed">{groomConfirmed} confirmed</span>
            <span className="status-badge status-pending">{groomPending} pending</span>
            <span className="status-badge status-declined">{groomDeclined} declined</span>
          </div>
          <p className="text-sm text-warm-gray">Gifted: <span className="font-semibold text-gold">{formatLKR(groomGifted)}</span></p>
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all" style={{ width: groomTotal > 0 ? `${(groomConfirmed / groomTotal) * 100}%` : '0%' }} />
          </div>
          <p className="text-xs text-warm-gray-light mt-1">{groomTotal > 0 ? Math.round((groomConfirmed / groomTotal) * 100) : 0}% confirmed</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-warm-gray-light uppercase tracking-wide mb-3">Grand Total</h3>
          <p className="text-2xl font-bold text-gold mb-1">{grandTotal} guests</p>
          <div className="flex flex-wrap gap-2 text-xs mb-3">
            <span className="status-badge status-confirmed">{grandConfirmed} confirmed</span>
            <span className="status-badge status-pending">{grandPending} pending</span>
            <span className="status-badge status-declined">{grandDeclined} declined</span>
          </div>
          <p className="text-sm text-warm-gray">Total Gifted: <span className="font-semibold text-gold">{formatLKR(grandGifted)}</span></p>
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all" style={{ width: grandTotal > 0 ? `${(grandConfirmed / grandTotal) * 100}%` : '0%' }} />
          </div>
          <p className="text-xs text-warm-gray-light mt-1">{grandTotal > 0 ? Math.round((grandConfirmed / grandTotal) * 100) : 0}% confirmed</p>
        </div>
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
            value={filterCategory}
            onChange={setFilterCategory}
            placeholder="All Categories"
            options={[{ value: '', label: 'All Categories' }, ...GUEST_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <PillSelect
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
            value={filterSaveDate}
            onChange={setFilterSaveDate}
            placeholder="Save Date"
            options={[
              { value: '', label: 'Save Date: All' },
              { value: 'yes', label: 'Save Date: Sent' },
              { value: 'no', label: 'Save Date: Not Sent' },
            ]}
          />
          <PillSelect
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
              onClick={() => { setFilterSide('all'); setFilterCategory(''); setFilterRsvp(''); setFilterSaveDate(''); setFilterInvite(''); setSearchName(''); }}
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
            <span className="text-gold font-medium"> · {filteredItems.reduce((s, i) => s + i.count, 0)} guests</span>
          )}
        </p>
      </div>

      {/* Add Guest Form */}
      {showForm && (
        <div ref={formRef} className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gold">New Guest</h3>
            <button onClick={() => setShowForm(false)} className="text-warm-gray-light hover:text-warm-gray"><X size={20} /></button>
          </div>
          <form onSubmit={addGuest}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">First Name *</label>
                <input type="text" required value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Last Name</label>
                <input type="text" value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Side</label>
                <Dropdown
                  options={["Bride's Side", "Groom's Side"]}
                  value={addForm.side === 'bride' ? "Bride's Side" : "Groom's Side"}
                  onChange={(v) => setAddForm({ ...addForm, side: v === "Bride's Side" ? 'bride' : 'groom' })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Category</label>
                <Dropdown
                  options={['', ...GUEST_CATEGORIES]}
                  value={addForm.category}
                  onChange={(v) => setAddForm({ ...addForm, category: v })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">RSVP Status</label>
                <Dropdown
                  options={['pending', 'confirmed', 'declined']}
                  value={addForm.rsvp_status}
                  onChange={(v) => setAddForm({ ...addForm, rsvp_status: v as GuestForm['rsvp_status'] })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Count (# of people)</label>
                <input type="number" min="0" value={addForm.count} onChange={(e) => setAddForm({ ...addForm, count: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Address</label>
                <input type="text" value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Gifted Amount (Rs.)</label>
                <input type="number" min="0" value={addForm.gifted_amount} onChange={(e) => setAddForm({ ...addForm, gifted_amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Meal Preference</label>
                <input type="text" value={addForm.meal_preference} onChange={(e) => setAddForm({ ...addForm, meal_preference: e.target.value })} placeholder="e.g. Vegetarian" />
              </div>
              <div className="flex flex-col gap-3 justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-gold" checked={addForm.save_the_date_sent} onChange={(e) => setAddForm({ ...addForm, save_the_date_sent: e.target.checked })} />
                  <span className="text-sm text-warm-gray">Save the Date Sent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-gold" checked={addForm.invitation_sent} onChange={(e) => setAddForm({ ...addForm, invitation_sent: e.target.checked })} />
                  <span className="text-sm text-warm-gray">Invitation Sent</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="btn-gold">Save Guest</button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-warm-gray-light">Loading guests...</div>
      ) : filteredItems.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-warm-gray-light">{items.length === 0 ? 'No guests yet. Add your first guest above.' : 'No guests match your filters.'}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ivory-dark">
                {([
                  { label: 'Name', field: 'first_name' as keyof GuestItem, align: 'left' },
                  { label: 'Category', field: 'category' as keyof GuestItem, align: 'left' },
                  { label: 'Address', field: 'address' as keyof GuestItem, align: 'left' },
                  { label: 'Count', field: 'count' as keyof GuestItem, align: 'center' },
                  { label: 'Gifted', field: 'gifted_amount' as keyof GuestItem, align: 'right' },
                  { label: 'RSVP', field: 'rsvp_status' as keyof GuestItem, align: 'left' },
                  { label: 'Save Date', field: 'save_the_date_sent' as keyof GuestItem, align: 'center' },
                  { label: 'Invite', field: 'invitation_sent' as keyof GuestItem, align: 'center' },
                  { label: 'Side', field: 'side' as keyof GuestItem, align: 'left' },
                ]).map(({ label, field, align }) => (
                  <th
                    key={field}
                    onClick={() => toggleSort(field)}
                    className={`px-4 py-3 text-xs font-semibold text-warm-gray-light uppercase tracking-wide cursor-pointer hover:text-gold select-none transition-colors text-${align}`}
                  >
                    {label}<SortIcon field={field} />
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, i) => {
                const isEditing = inlineEditId === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-ivory-dark last:border-0 ${isEditing ? 'bg-amber-50/60' : i % 2 === 0 ? '' : 'bg-ivory/40'}`}
                    style={isEditing ? { boxShadow: 'inset 3px 0 0 #b8860b' } : {}}
                  >
                    {isEditing ? (
                      <>
                        <td className="px-3 py-2 min-w-[160px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1">
                              {inlineInput('first_name', 'text', 'First name')}
                              {inlineInput('last_name', 'text', 'Last name')}
                            </div>
                            {inlineInput('meal_preference', 'text', 'Meal preference')}
                          </div>
                        </td>
                        <td className="px-3 py-2 min-w-[120px]">{inlineSelect('category', ['', ...GUEST_CATEGORIES])}</td>
                        <td className="px-3 py-2 min-w-[130px]">{inlineInput('address', 'text', 'Address')}</td>
                        <td className="px-3 py-2 min-w-[60px]">{inlineInput('count', 'number')}</td>
                        <td className="px-3 py-2 min-w-[80px]">{inlineInput('gifted_amount', 'number')}</td>
                        <td className="px-3 py-2 min-w-[110px]">{inlineSelect('rsvp_status', ['pending', 'confirmed', 'declined'])}</td>
                        <td className="px-3 py-2 text-center">{inlineCheck('save_the_date_sent')}</td>
                        <td className="px-3 py-2 text-center">{inlineCheck('invitation_sent')}</td>
                        <td className="px-3 py-2 min-w-[80px]">{inlineSelect('side', ['bride', 'groom'])}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1.5 items-end">
                            <button
                              onClick={() => saveInline(item.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gold text-white text-xs font-medium hover:bg-gold-dark transition-colors"
                            >
                              <Check size={11} /> Save
                            </button>
                            <button
                              onClick={() => setInlineEditId(null)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-ivory-dark text-warm-gray-light text-xs font-medium hover:border-red-300 hover:text-red-500 transition-colors"
                            >
                              <X size={11} /> Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-warm-gray">
                          {item.first_name} {item.last_name}
                          {item.meal_preference && <span className="block text-xs text-warm-gray-light">{item.meal_preference}</span>}
                        </td>
                        <td className="px-4 py-3 text-warm-gray-light">{item.category || '—'}</td>
                        <td className="px-4 py-3 text-warm-gray-light max-w-[160px] truncate">{item.address || '—'}</td>
                        <td className="px-4 py-3 text-center font-semibold text-warm-gray">{item.count}</td>
                        <td className="px-4 py-3 text-right text-warm-gray">{item.gifted_amount > 0 ? formatLKR(Number(item.gifted_amount)) : '—'}</td>
                        <td className="px-4 py-3">{rsvpBadge(item.rsvp_status)}</td>
                        <td className="px-4 py-3 text-center">{boolBadge(item.save_the_date_sent)}</td>
                        <td className="px-4 py-3 text-center">{boolBadge(item.invitation_sent)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${item.side === 'bride' ? 'text-blush-dark' : 'text-sage'}`}>
                            {item.side === 'bride' ? "Bride's" : "Groom's"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => { setInlineEditId(item.id); setInlineForm(itemToForm(item)); }}
                              className="text-warm-gray-light hover:text-gold transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => deleteItem(item.id)} className="text-warm-gray-light hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </>
                    )}
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
