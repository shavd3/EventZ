'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task } from '@/lib/types';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, X, Phone, Store } from 'lucide-react';
import Dropdown from '@/components/Dropdown';

type TaskForm = {
  title: string;
  category: string;
  assignee: string;
  due_date: string;
  notes: string;
  vendor: string;
  contact: string;
  price: string;
};

const emptyForm: TaskForm = {
  title: '',
  category: '',
  assignee: '',
  due_date: '',
  notes: '',
  vendor: '',
  contact: '',
  price: '',
};

function formatLKR(amount: number) {
  if (!amount) return '';
  return 'Rs. ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('name')
      .order('sort_order', { ascending: true });
    const names = (data || []).map((c) => c.name);
    setCategories(names);
    return names;
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    setTasks(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCategories().then((cats) => {
      setForm((f) => ({ ...f, category: f.category || cats[0] || '' }));
    });
    fetchTasks();
  }, []);

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload = {
      title: form.title,
      category: form.category,
      assignee: form.assignee,
      due_date: form.due_date || null,
      notes: form.notes,
      vendor: form.vendor,
      contact: form.contact,
      price: parseFloat(form.price) || 0,
    };

    if (editId) {
      await supabase.from('tasks').update(payload).eq('id', editId);
    } else {
      await supabase.from('tasks').insert({ ...payload, status: 'pending' });
    }

    setForm(emptyForm);
    setShowForm(false);
    setEditId(null);
    fetchTasks();
  }

  function startEdit(task: Task) {
    setForm({
      title: task.title,
      category: task.category,
      assignee: task.assignee,
      due_date: task.due_date || '',
      notes: task.notes,
      vendor: task.vendor || '',
      contact: task.contact || '',
      price: task.price ? task.price.toString() : '',
    });
    setEditId(task.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    fetchTasks();
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  }

  const grouped = categories.reduce((acc, cat) => {
    const catTasks = tasks.filter((t) => t.category === cat);
    if (catTasks.length > 0) acc[cat] = catTasks;
    return acc;
  }, {} as Record<string, Task[]>);

  const uncategorized = tasks.filter((t) => !categories.includes(t.category));
  if (uncategorized.length > 0) grouped['Uncategorized'] = [...(grouped['Uncategorized'] || []), ...uncategorized];

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold">Tasks</h1>
          <p className="text-warm-gray-light text-sm mt-1">
            {doneTasks} of {totalTasks} tasks completed
          </p>
        </div>
        <button
          className="btn-gold flex items-center gap-2"
          onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
            setForm(emptyForm);
          }}
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Progress bar */}
      <div className="card mb-6">
        <div className="h-3 bg-ivory-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-warm-gray-light mt-2 text-right">
          {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%
        </p>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <form onSubmit={saveTask} className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gold">
              {editId ? 'Edit Task' : 'New Task'}
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="text-warm-gray-light hover:text-warm-gray"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-medium text-warm-gray mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Book the florist"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Category</label>
              <Dropdown
                value={form.category}
                options={categories}
                onChange={(v) => setForm({ ...form, category: v })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Vendor / Party</label>
              <input
                type="text"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="e.g., Enexus Studio"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Contact No.</label>
              <input
                type="tel"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="+94 77 xxx xxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Price (LKR)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Assigned To</label>
              <input
                type="text"
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                placeholder="e.g., Mom"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn-gold">{editId ? 'Update Task' : 'Save Task'}</button>
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

      {/* Task Categories */}
      {loading ? (
        <div className="text-center py-12 text-warm-gray-light">Loading tasks...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-warm-gray-light">
          <p className="text-lg mb-2">No tasks yet</p>
          <p className="text-sm">Click &quot;Add Task&quot; to get started!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catTasks]) => {
          const isCollapsed = collapsed[category];
          const doneCount = catTasks.filter((t) => t.status === 'done').length;
          return (
            <div key={category} className="card mb-4">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setCollapsed({ ...collapsed, [category]: !isCollapsed })}
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? (
                    <ChevronRight size={18} className="text-gold" />
                  ) : (
                    <ChevronDown size={18} className="text-gold" />
                  )}
                  <h3 className="text-lg font-semibold text-gold">{category}</h3>
                </div>
                <span className="text-xs text-warm-gray-light">
                  {doneCount}/{catTasks.length} done
                </span>
              </button>

              {!isCollapsed && (
                <div className="mt-3 space-y-2">
                  {catTasks.map((task) => {
                    const isExpanded = expanded[task.id];
                    const hasDetails = task.vendor || task.contact || task.price > 0 || task.notes;
                    return (
                      <div
                        key={task.id}
                        className={`rounded-lg border transition-colors ${
                          task.status === 'done'
                            ? 'bg-green-50/50 border-green-200'
                            : 'bg-ivory/50 border-ivory-dark'
                        }`}
                      >
                        {/* Main row */}
                        <div className="flex items-start gap-3 p-3">
                          <button
                            onClick={() => toggleStatus(task)}
                            className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              task.status === 'done'
                                ? 'bg-gold border-gold text-white'
                                : 'border-warm-gray-light hover:border-gold'
                            }`}
                          >
                            {task.status === 'done' && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${task.status === 'done' ? 'line-through text-warm-gray-light' : ''}`}>
                              {task.title}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-warm-gray-light">
                              {task.assignee && <span>Assigned: {task.assignee}</span>}
                              {task.due_date && (
                                <span>
                                  Due: {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {hasDetails && (
                              <button
                                onClick={() => setExpanded({ ...expanded, [task.id]: !isExpanded })}
                                className="p-1 text-warm-gray-light hover:text-gold transition-colors"
                                title="Show details"
                              >
                                <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                            <button
                              onClick={() => startEdit(task)}
                              className="p-1 text-warm-gray-light hover:text-gold transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1 text-warm-gray-light hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && hasDetails && (
                          <div className="px-3 pb-3 pt-0 ml-8 border-t border-ivory-dark/50 mt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                              {task.vendor && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Store size={13} className="text-gold flex-shrink-0" />
                                  <div>
                                    <span className="text-warm-gray-light">Vendor</span>
                                    <p className="font-medium text-warm-gray">{task.vendor}</p>
                                  </div>
                                </div>
                              )}
                              {task.contact && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Phone size={13} className="text-gold flex-shrink-0" />
                                  <div>
                                    <span className="text-warm-gray-light">Contact</span>
                                    <p className="font-medium text-warm-gray">{task.contact}</p>
                                  </div>
                                </div>
                              )}
                              {task.price > 0 && (
                                <div className="text-xs">
                                  <span className="text-warm-gray-light">Price</span>
                                  <p className="font-medium text-gold">{formatLKR(task.price)}</p>
                                </div>
                              )}
                            </div>
                            {task.notes && (
                              <p className="text-xs text-warm-gray-light mt-2 italic border-t border-ivory-dark/50 pt-2">
                                {task.notes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
