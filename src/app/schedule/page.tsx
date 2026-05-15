'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ScheduleItem } from '@/lib/types';
import { Plus, Trash2, MapPin } from 'lucide-react';

export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ time: '', title: '', description: '', location: '' });
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    const { data } = await supabase
      .from('schedule_items')
      .select('*')
      .order('sort_order', { ascending: true });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, []);

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.time.trim() || !form.title.trim()) return;

    if (editId) {
      await supabase.from('schedule_items').update({
        time: form.time,
        title: form.title,
        description: form.description,
        location: form.location,
      }).eq('id', editId);
    } else {
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) : 0;
      await supabase.from('schedule_items').insert({
        time: form.time,
        title: form.title,
        description: form.description,
        location: form.location,
        sort_order: maxOrder + 1,
      });
    }

    setForm({ time: '', title: '', description: '', location: '' });
    setShowForm(false);
    setEditId(null);
    fetchItems();
  }

  function startEdit(item: ScheduleItem) {
    setForm({ time: item.time, title: item.title, description: item.description, location: item.location });
    setEditId(item.id);
    setShowForm(true);
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this schedule item?')) return;
    await supabase.from('schedule_items').delete().eq('id', id);
    fetchItems();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold">Wedding Day</h1>
          <p className="text-warm-gray-light text-sm mt-1">
            Saturday, 10th October 2026 &middot; {items.length} events
          </p>
        </div>
        <button
          className="btn-gold flex items-center gap-2"
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
            setForm({ time: '', title: '', description: '', location: '' });
          }}
        >
          <Plus size={16} /> Add Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveItem} className="card mb-6">
          <h3 className="text-lg font-semibold text-gold mb-4">
            {editId ? 'Edit Event' : 'New Event'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Time *</label>
              <input
                type="text"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="e.g., 03:00 PM"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Wedding Ceremony"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., St. Sebastians Church"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional details..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn-gold">{editId ? 'Update' : 'Save Event'}</button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => { setShowForm(false); setEditId(null); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-warm-gray-light">Loading schedule...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-warm-gray-light">
          <p className="text-lg mb-2">No schedule items yet</p>
          <p className="text-sm">Plan out the wedding day hour by hour!</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[88px] top-4 bottom-4 w-0.5 bg-gold/20" />
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="relative pl-28">
                <div className="absolute left-0 top-3 w-20 text-right">
                  <span className="text-sm font-semibold text-gold whitespace-nowrap">{item.time}</span>
                </div>
                <div className="absolute left-[83px] top-4 w-3 h-3 rounded-full bg-gold border-2 border-white shadow-sm" />

                <div
                  className="card hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => startEdit(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-warm-gray">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-warm-gray-light mt-1">{item.description}</p>
                      )}
                      {item.location && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-warm-gray-light">
                          <MapPin size={12} />
                          <span>{item.location}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                      className="text-warm-gray-light hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
