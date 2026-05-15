'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BudgetItem } from '@/lib/types';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import Dropdown from '@/components/Dropdown';

function formatLKR(amount: number) {
  return 'Rs. ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

type BudgetForm = {
  category: string;
  vendor: string;
  contact: string;
  total_expense: string;
  advance_paid: string;
  advance_date: string;
  due_date: string;
  status: 'not_paid' | 'advance_paid' | 'settled';
  assignee: string;
  side: 'bride' | 'groom';
  notes: string;
};

const emptyForm: BudgetForm = {
  category: '',
  vendor: '',
  contact: '',
  total_expense: '',
  advance_paid: '',
  advance_date: '',
  due_date: '',
  status: 'not_paid',
  assignee: '',
  side: 'groom',
  notes: '',
};

export default function BudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [filterSide, setFilterSide] = useState<'all' | 'bride' | 'groom'>('all');

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
      contact: form.contact,
      total_expense: parseFloat(form.total_expense) || 0,
      advance_paid: parseFloat(form.advance_paid) || 0,
      advance_date: form.advance_date || null,
      due_date: form.due_date || null,
      status: form.status,
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
      contact: item.contact,
      total_expense: item.total_expense.toString(),
      advance_paid: item.advance_paid.toString(),
      advance_date: item.advance_date || '',
      due_date: item.due_date || '',
      status: item.status,
      assignee: item.assignee,
      side: item.side,
      notes: item.notes,
    });
    setEditId(item.id);
    setShowForm(true);
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this budget item?')) return;
    await supabase.from('budget_items').delete().eq('id', id);
    fetchItems();
  }

  const filteredItems = filterSide === 'all' ? items : items.filter((i) => i.side === filterSide);

  const brideItems = items.filter((i) => i.side === 'bride');
  const groomItems = items.filter((i) => i.side === 'groom');

  const brideTotal = brideItems.reduce((s, i) => s + Number(i.total_expense), 0);
  const bridePaid = brideItems.reduce((s, i) => {
    if (i.status === 'settled') return s + Number(i.total_expense);
    return s + Number(i.advance_paid);
  }, 0);

  const groomTotal = groomItems.reduce((s, i) => s + Number(i.total_expense), 0);
  const groomPaid = groomItems.reduce((s, i) => {
    if (i.status === 'settled') return s + Number(i.total_expense);
    return s + Number(i.advance_paid);
  }, 0);

  const grandTotal = brideTotal + groomTotal;
  const grandPaid = bridePaid + groomPaid;

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
          <p className="text-warm-gray-light text-sm mt-1">{items.length} expenses tracked</p>
        </div>
        <button
          className="btn-gold flex items-center gap-2"
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
            setForm(emptyForm);
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
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all"
              style={{ width: `${grandTotal > 0 ? (grandPaid / grandTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'bride', 'groom'] as const).map((f) => (
          <button
            key={f}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterSide === f
                ? 'bg-gold text-white'
                : 'bg-white text-warm-gray border border-ivory-dark hover:border-gold'
            }`}
            onClick={() => setFilterSide(f)}
          >
            {f === 'all' ? 'All' : f === 'bride' ? "Bride's Side" : "Groom's Side"}
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-6">
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
                <label className="block text-xs font-medium text-warm-gray mb-1">Contact No.</label>
                <input type="tel" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="+94 77 xxx xxxx" />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Total Expense (LKR) *</label>
                <input type="number" value={form.total_expense} onChange={(e) => setForm({ ...form, total_expense: e.target.value })} placeholder="0.00" min="0" step="0.01" required />
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
          <p className="text-lg mb-2">No expenses yet</p>
          <p className="text-sm">Start tracking your wedding budget!</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ivory-dark">
                <th className="text-left py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Category</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Vendor</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Contact</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Total</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Advance</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Adv. Date</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Remaining</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Due Date</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Assignee</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Side</th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-warm-gray uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const remaining = Number(item.total_expense) - Number(item.advance_paid);
                return (
                  <tr key={item.id} className="border-b border-ivory-dark/50 hover:bg-ivory/50 transition-colors">
                    <td className="py-3 px-2 font-medium">{item.category}</td>
                    <td className="py-3 px-2">{item.vendor}</td>
                    <td className="py-3 px-2 text-xs">{item.contact}</td>
                    <td className="py-3 px-2 text-right font-medium">{formatLKR(Number(item.total_expense))}</td>
                    <td className="py-3 px-2 text-right">{formatLKR(Number(item.advance_paid))}</td>
                    <td className="py-3 px-2 text-xs">
                      {item.advance_date ? new Date(item.advance_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '-'}
                    </td>
                    <td className="py-3 px-2 text-right font-medium">
                      <span className={remaining > 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatLKR(remaining)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs">
                      {item.due_date ? new Date(item.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '-'}
                    </td>
                    <td className="py-3 px-2 text-center">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-2">{item.assignee}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        item.side === 'bride' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.side === 'bride' ? 'Bride' : 'Groom'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(item)} className="p-1 text-warm-gray-light hover:text-gold transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="p-1 text-warm-gray-light hover:text-red-500 transition-colors">
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
