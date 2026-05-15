'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task } from '@/lib/types';
import { Circle, CheckCircle2, ChevronDown, Phone, Store } from 'lucide-react';

function formatLKR(amount: number) {
  if (!amount) return '';
  return 'Rs. ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

export default function TimelinePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });
    setTasks(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchTasks(); }, []);

  async function toggleTask(task: Task) {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    fetchTasks();
  }

  function getDaysUntil(dateStr: string) {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  const withDate = tasks.filter((t) => t.due_date);
  const withoutDate = tasks.filter((t) => !t.due_date);

  const grouped: Record<string, Task[]> = {};
  withDate.forEach((t) => {
    const monthKey = new Date(t.due_date!).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!grouped[monthKey]) grouped[monthKey] = [];
    grouped[monthKey].push(t);
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gold">Planning Timeline</h1>
        <p className="text-warm-gray-light text-sm mt-1">
          {doneTasks} of {totalTasks} tasks completed &middot; Showing tasks with due dates
        </p>
      </div>

      {/* Progress */}
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

      {loading ? (
        <div className="text-center py-12 text-warm-gray-light">Loading timeline...</div>
      ) : Object.keys(grouped).length === 0 && withoutDate.length === 0 ? (
        <div className="text-center py-12 text-warm-gray-light">
          <p className="text-lg mb-2">No tasks yet</p>
          <p className="text-sm">Add tasks with due dates to see them on the timeline!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, monthTasks]) => (
            <div key={month}>
              <h2 className="text-lg font-semibold text-gold mb-3 sticky top-16 bg-ivory py-2 z-10">
                {month}
              </h2>
              <div className="relative">
                <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-ivory-dark" />
                <div className="space-y-3">
                  {monthTasks.map((task) => {
                    const daysUntil = getDaysUntil(task.due_date!);
                    const isPast = daysUntil < 0 && task.status !== 'done';
                    const isExpanded = expanded[task.id];
                    const hasDetails = task.vendor || task.contact || task.price > 0 || task.notes;
                    return (
                      <div key={task.id} className="relative pl-10">
                        <button
                          onClick={() => toggleTask(task)}
                          className="absolute left-0 top-3 z-10"
                        >
                          {task.status === 'done' ? (
                            <CheckCircle2 size={22} className="text-gold fill-gold/20" />
                          ) : (
                            <Circle size={22} className={isPast ? 'text-red-400' : 'text-warm-gray-light hover:text-gold'} />
                          )}
                        </button>

                        <div className={`card ${task.status === 'done' ? 'opacity-60' : ''} ${isPast ? 'border-red-200' : ''}`}>
                          {/* Summary row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className={`font-semibold text-sm ${task.status === 'done' ? 'line-through text-warm-gray-light' : 'text-warm-gray'}`}>
                                {task.title}
                              </h3>
                              <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                                <span className="text-warm-gray-light">
                                  {new Date(task.due_date!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                {task.assignee && (
                                  <span className="text-warm-gray-light">Assigned: {task.assignee}</span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gold/10 text-gold">
                                  {task.category}
                                </span>
                                {task.status !== 'done' && (
                                  <span className={isPast ? 'text-red-500 font-medium' : 'text-gold'}>
                                    {isPast
                                      ? `${Math.abs(daysUntil)} days overdue`
                                      : daysUntil === 0
                                      ? 'Due today!'
                                      : `${daysUntil} days left`}
                                  </span>
                                )}
                                {task.status === 'done' && (
                                  <span className="text-green-600 font-medium">Done</span>
                                )}
                              </div>
                            </div>
                            {hasDetails && (
                              <button
                                onClick={() => setExpanded({ ...expanded, [task.id]: !isExpanded })}
                                className="p-1 text-warm-gray-light hover:text-gold transition-colors flex-shrink-0"
                              >
                                <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>

                          {/* Expanded details */}
                          {isExpanded && hasDetails && (
                            <div className="border-t border-ivory-dark/50 mt-3 pt-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {withoutDate.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-warm-gray-light mb-3">No Due Date</h2>
              <div className="space-y-2">
                {withoutDate.map((task) => {
                  const isExpanded = expanded[task.id];
                  const hasDetails = task.vendor || task.contact || task.price > 0 || task.notes;
                  return (
                    <div key={task.id} className="card">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleTask(task)}>
                          {task.status === 'done' ? (
                            <CheckCircle2 size={20} className="text-gold fill-gold/20" />
                          ) : (
                            <Circle size={20} className="text-warm-gray-light hover:text-gold" />
                          )}
                        </button>
                        <div className="flex-1">
                          <span className={`text-sm ${task.status === 'done' ? 'line-through text-warm-gray-light' : ''}`}>
                            {task.title}
                          </span>
                          {task.assignee && <span className="text-xs text-warm-gray-light ml-2">({task.assignee})</span>}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gold/10 text-gold">
                          {task.category}
                        </span>
                        {hasDetails && (
                          <button
                            onClick={() => setExpanded({ ...expanded, [task.id]: !isExpanded })}
                            className="p-1 text-warm-gray-light hover:text-gold transition-colors"
                          >
                            <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                      {isExpanded && hasDetails && (
                        <div className="border-t border-ivory-dark/50 mt-3 pt-3 ml-8">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
