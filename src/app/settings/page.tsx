'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, GripVertical, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    setCategories(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    if (categories.some((c) => c.name.toLowerCase() === newName.trim().toLowerCase())) {
      alert('Category already exists');
      return;
    }
    const maxOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) : 0;
    await supabase.from('categories').insert({ name: newName.trim(), sort_order: maxOrder + 1 });
    setNewName('');
    fetchCategories();
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    const oldCat = categories.find((c) => c.id === id);
    if (!oldCat) return;

    await supabase.from('categories').update({ name: editName.trim() }).eq('id', id);

    // Also update all tasks and budget items that used the old name
    if (oldCat.name !== editName.trim()) {
      await supabase.from('tasks').update({ category: editName.trim() }).eq('category', oldCat.name);
      await supabase.from('budget_items').update({ category: editName.trim() }).eq('category', oldCat.name);
    }

    setEditId(null);
    setEditName('');
    fetchCategories();
  }

  async function deleteCategory(cat: Category) {
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('category', cat.name);

    const { count: budgetCount } = await supabase
      .from('budget_items')
      .select('*', { count: 'exact', head: true })
      .eq('category', cat.name);

    const used = (taskCount || 0) + (budgetCount || 0);

    if (used > 0) {
      if (!confirm(`"${cat.name}" is used by ${used} item(s). Deleting it won't remove those items, but they'll show as uncategorized. Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete "${cat.name}"?`)) return;
    }

    await supabase.from('categories').delete().eq('id', cat.id);
    fetchCategories();
  }

  async function moveCategory(id: string, direction: 'up' | 'down') {
    const idx = categories.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const a = categories[idx];
    const b = categories[swapIdx];

    await Promise.all([
      supabase.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    fetchCategories();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gold">Categories</h1>
        <p className="text-warm-gray-light text-sm mt-1">
          Manage categories used across Tasks and Budget
        </p>
      </div>

      {/* Add new category */}
      <form onSubmit={addCategory} className="card mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name..."
            className="flex-1"
          />
          <button type="submit" className="btn-gold flex items-center gap-2 whitespace-nowrap">
            <Plus size={16} /> Add
          </button>
        </div>
      </form>

      {/* Category list */}
      {loading ? (
        <div className="text-center py-12 text-warm-gray-light">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-warm-gray-light">
          <p className="text-lg mb-2">No categories yet</p>
          <p className="text-sm">Add your first category above!</p>
        </div>
      ) : (
        <div className="card">
          <div className="space-y-1">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-ivory/50 transition-colors group"
              >
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => moveCategory(cat.id, 'up')}
                    disabled={idx === 0}
                    className="text-warm-gray-light hover:text-gold disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs leading-none"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveCategory(cat.id, 'down')}
                    disabled={idx === categories.length - 1}
                    className="text-warm-gray-light hover:text-gold disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-xs leading-none"
                  >
                    ▼
                  </button>
                </div>

                {/* Name / Edit */}
                <div className="flex-1 min-w-0">
                  {editId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(cat.id); }}
                        className="flex-1"
                        autoFocus
                      />
                      <button onClick={() => saveEdit(cat.id)} className="btn-gold text-xs px-3 py-1.5">Save</button>
                      <button onClick={() => { setEditId(null); setEditName(''); }} className="text-warm-gray-light hover:text-warm-gray">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditId(cat.id); setEditName(cat.name); }}
                      className="text-sm font-medium text-warm-gray hover:text-gold transition-colors text-left w-full"
                    >
                      {cat.name}
                    </button>
                  )}
                </div>

                {/* Delete */}
                {editId !== cat.id && (
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="text-warm-gray-light hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
