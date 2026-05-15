'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, TASK_CATEGORIES } from '@/lib/types';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const emptyTask: Omit<Task, 'id' | 'created_at'> = {
  title: '',
  category: TASK_CATEGORIES[0],
  assignee: '',
  due_date: null,
  status: 'pending',
  notes: '',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyTask);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    setTasks(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchTasks(); }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await supabase.from('tasks').insert({
      title: form.title,
      category: form.category,
      assignee: form.assignee,
      due_date: form.due_date || null,
      status: 'pending',
      notes: form.notes,
    });
    setForm(emptyTask);
    setShowForm(false);
    fetchTasks();
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

  const grouped = TASK_CATEGORIES.reduce((acc, cat) => {
    const catTasks = tasks.filter((t) => t.category === cat);
    if (catTasks.length > 0) acc[cat] = catTasks;
    return acc;
  }, {} as Record<string, Task[]>);

  const uncategorized = tasks.filter((t) => !TASK_CATEGORIES.includes(t.category as typeof TASK_CATEGORIES[number]));
  if (uncategorized.length > 0) grouped['Other'] = [...(grouped['Other'] || []), ...uncategorized];

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
        <button className="btn-gold flex items-center gap-2" onClick={() => setShowForm(!showForm)}>
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

      {/* Add Task Form */}
      {showForm && (
        <form onSubmit={addTask} className="card mb-6">
          <h3 className="text-lg font-semibold text-gold mb-4">New Task</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
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
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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
                value={form.due_date || ''}
                onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-warm-gray mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn-gold">Save Task</button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
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
                  {isCollapsed ? <ChevronRight size={18} className="text-gold" /> : <ChevronDown size={18} className="text-gold" />}
                  <h3 className="text-lg font-semibold text-gold">{category}</h3>
                </div>
                <span className="text-xs text-warm-gray-light">
                  {doneCount}/{catTasks.length} done
                </span>
              </button>

              {!isCollapsed && (
                <div className="mt-3 space-y-2">
                  {catTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        task.status === 'done'
                          ? 'bg-green-50/50 border-green-200'
                          : 'bg-ivory/50 border-ivory-dark'
                      }`}
                    >
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
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-warm-gray-light">
                          {task.assignee && <span>Assigned: {task.assignee}</span>}
                          {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                        </div>
                        {task.notes && <p className="text-xs text-warm-gray-light mt-1 italic">{task.notes}</p>}
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-warm-gray-light hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
