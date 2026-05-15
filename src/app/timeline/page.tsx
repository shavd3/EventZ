'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TimelineMilestone } from '@/lib/types';
import { Plus, Trash2, Circle, CheckCircle2 } from 'lucide-react';

export default function TimelinePage() {
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', target_date: '' });
  const [loading, setLoading] = useState(true);

  async function fetchMilestones() {
    const { data } = await supabase
      .from('timeline_milestones')
      .select('*')
      .order('target_date', { ascending: true });
    setMilestones(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchMilestones(); }, []);

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.target_date) return;
    await supabase.from('timeline_milestones').insert({
      title: form.title,
      description: form.description,
      target_date: form.target_date,
    });
    setForm({ title: '', description: '', target_date: '' });
    setShowForm(false);
    fetchMilestones();
  }

  async function toggleMilestone(m: TimelineMilestone) {
    await supabase
      .from('timeline_milestones')
      .update({ is_completed: !m.is_completed })
      .eq('id', m.id);
    fetchMilestones();
  }

  async function deleteMilestone(id: string) {
    if (!confirm('Delete this milestone?')) return;
    await supabase.from('timeline_milestones').delete().eq('id', id);
    fetchMilestones();
  }

  function getDaysUntil(dateStr: string) {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  }

  const completedCount = milestones.filter((m) => m.is_completed).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold">Planning Timeline</h1>
          <p className="text-warm-gray-light text-sm mt-1">
            {completedCount} of {milestones.length} milestones reached
          </p>
        </div>
        <button className="btn-gold flex items-center gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Add Milestone
        </button>
      </div>

      {showForm && (
        <form onSubmit={addMilestone} className="card mb-6">
          <h3 className="text-lg font-semibold text-gold mb-4">New Milestone</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-warm-gray mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Book photographer"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-warm-gray mb-1">Target Date *</label>
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                required
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
            <button type="submit" className="btn-gold">Save Milestone</button>
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-warm-gray-light">Loading timeline...</div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-12 text-warm-gray-light">
          <p className="text-lg mb-2">No milestones yet</p>
          <p className="text-sm">Add milestones to track your wedding planning progress!</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-ivory-dark" />
          <div className="space-y-0">
            {milestones.map((m, i) => {
              const daysUntil = getDaysUntil(m.target_date);
              const isPast = daysUntil < 0 && !m.is_completed;
              return (
                <div key={m.id} className="relative pl-14 pb-8">
                  <button
                    onClick={() => toggleMilestone(m)}
                    className="absolute left-3.5 top-1 z-10"
                  >
                    {m.is_completed ? (
                      <CheckCircle2 size={22} className="text-gold fill-gold/20" />
                    ) : (
                      <Circle size={22} className={isPast ? 'text-red-400' : 'text-warm-gray-light hover:text-gold'} />
                    )}
                  </button>

                  <div className={`card ${m.is_completed ? 'opacity-70' : ''} ${isPast ? 'border-red-200' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${m.is_completed ? 'line-through text-warm-gray-light' : 'text-warm-gray'}`}>
                          {m.title}
                        </h3>
                        {m.description && (
                          <p className="text-sm text-warm-gray-light mt-1">{m.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="text-warm-gray-light">
                            {new Date(m.target_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          {!m.is_completed && (
                            <span className={isPast ? 'text-red-500 font-medium' : 'text-gold'}>
                              {isPast
                                ? `${Math.abs(daysUntil)} days overdue`
                                : daysUntil === 0
                                ? 'Today!'
                                : `${daysUntil} days left`}
                            </span>
                          )}
                          {m.is_completed && (
                            <span className="text-green-600 font-medium">Completed</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMilestone(m.id)}
                        className="text-warm-gray-light hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
