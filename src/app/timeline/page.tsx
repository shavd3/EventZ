'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarEvent } from '@/lib/types';
import { Clock, Heart, Plus, Trash2, X } from 'lucide-react';

// One month only — the wedding month. Everything below derives from these.
const YEAR = 2026;
const MONTH_INDEX = 9; // October, 0-based for Date construction
const DAYS_IN_MONTH = 31;
const FIRST_DAY = '2026-10-01';
const LAST_DAY = '2026-10-31';
const WEDDING_DAY = '2026-10-10';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Monday-first grid: blank cells before the 1st, and the total rounded up to whole weeks.
const LEADING_BLANKS = (new Date(YEAR, MONTH_INDEX, 1).getDay() + 6) % 7;
const TOTAL_CELLS = Math.ceil((LEADING_BLANKS + DAYS_IN_MONTH) / 7) * 7;

function dayKey(day: number): string {
  return `${YEAR}-${String(MONTH_INDEX + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function weekdayOf(key: string): number {
  return new Date(YEAR, MONTH_INDEX, Number(key.slice(-2))).getDay();
}

/** "Saturday 10 October" */
function dayLabel(key: string): string {
  return `${DAY_NAMES[weekdayOf(key)]} ${Number(key.slice(-2))} October`;
}

/** "Sat 10 Oct" */
function shortDayLabel(key: string): string {
  return `${WEEKDAYS[(weekdayOf(key) + 6) % 7]} ${Number(key.slice(-2))} Oct`;
}

/** Postgres "15:00:00" → "3:00 PM"; null stays null. */
function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Postgres "15:00:00" → the "15:00" an <input type="time"> wants. */
function toInputTime(value: string | null): string {
  return value ? value.slice(0, 5) : '';
}

function localTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const subscribeNever = () => () => {};

/** Today as YYYY-MM-DD on the client, null during server render so hydration matches. */
function useToday(): string | null {
  return useSyncExternalStore(subscribeNever, localTodayKey, () => null);
}

function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

type EventFormValues = { date: string; time: string; title: string; description: string };
type Editor = { mode: 'add'; date: string } | { mode: 'edit'; event: CalendarEvent };
type LoadState = 'loading' | 'ready' | 'missing-table' | 'error';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadMessage, setLoadMessage] = useState('');
  // Which event is being added/edited. On desktop it renders inside the day cell;
  // on phones inside the day sheet (sheetDay), never both.
  const [editor, setEditor] = useState<Editor | null>(null);
  const [sheetDay, setSheetDay] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const today = useToday();

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('event_date', FIRST_DAY)
      .lte('event_date', LAST_DAY)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (error) {
      // PGRST205: table not in the schema cache, i.e. supabase-calendar.sql hasn't been run.
      const missing = error.code === 'PGRST205' || /schema cache|does not exist/i.test(error.message);
      setLoadState(missing ? 'missing-table' : 'error');
      setLoadMessage(error.message);
      return;
    }
    setEvents(data || []);
    setLoadState('ready');
  }

  useEffect(() => { fetchEvents(); }, []);

  const byDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) (map[ev.event_date] ??= []).push(ev);
    return map;
  }, [events]);

  const nextEvent = useMemo(
    () => (today ? events.find((ev) => ev.event_date >= today) ?? null : null),
    [events, today],
  );
  const daysToGo = today ? daysBetween(today, WEDDING_DAY) : null;

  function openAdd(date: string) {
    setFormError('');
    setEditor({ mode: 'add', date });
  }

  function openEdit(event: CalendarEvent) {
    setFormError('');
    setEditor({ mode: 'edit', event });
  }

  function closeEditor() {
    setEditor(null);
    setFormError('');
  }

  function openSheet(date: string) {
    closeEditor();
    setSheetDay(date);
  }

  function closeSheet() {
    setSheetDay(null);
    closeEditor();
  }

  async function saveEvent(values: EventFormValues) {
    if (!editor) return;
    const title = values.title.trim();
    if (!title) return;
    setSaving(true);
    setFormError('');
    const payload = {
      event_date: values.date,
      event_time: values.time || null,
      title,
      description: values.description.trim(),
    };
    const { error } =
      editor.mode === 'edit'
        ? await supabase.from('calendar_events').update(payload).eq('id', editor.event.id)
        : await supabase.from('calendar_events').insert(payload);
    setSaving(false);
    if (error) {
      setFormError(`Could not save: ${error.message}`);
      return;
    }
    setEditor(null);
    // Moved to another day from the phone sheet: follow it there.
    if (sheetDay && values.date !== sheetDay) setSheetDay(values.date);
    await fetchEvents();
  }

  async function deleteEvent(event: CalendarEvent) {
    if (!confirm(`Delete "${event.title}"?`)) return;
    const { error } = await supabase.from('calendar_events').delete().eq('id', event.id);
    if (error) {
      setFormError(`Could not delete: ${error.message}`);
      return;
    }
    setEditor(null);
    await fetchEvents();
  }

  const editorNode = (dense: boolean) =>
    editor && (
      <EventForm
        key={editor.mode === 'edit' ? `edit-${editor.event.id}` : `add-${editor.date}`}
        mode={editor.mode}
        dense={dense}
        initial={
          editor.mode === 'edit'
            ? {
                date: editor.event.event_date,
                time: toInputTime(editor.event.event_time),
                title: editor.event.title,
                description: editor.event.description,
              }
            : { date: editor.date, time: '', title: '', description: '' }
        }
        saving={saving}
        error={formError}
        onSave={saveEvent}
        onCancel={closeEditor}
        onDelete={editor.mode === 'edit' ? () => deleteEvent(editor.event) : undefined}
      />
    );

  const subtitle =
    loadState === 'loading'
      ? 'Loading events…'
      : `${events.length} ${events.length === 1 ? 'event' : 'events'} planned`;
  const countdown =
    daysToGo === null ? '' : daysToGo > 0 ? ` · ${daysToGo} days to go` : daysToGo === 0 ? ' · Today is the day!' : '';
  const nextTime = nextEvent ? formatTime(nextEvent.event_time) : null;
  const sheetEvents = sheetDay ? byDay[sheetDay] ?? [] : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold">October 2026</h1>
          <p className="text-warm-gray-light text-sm mt-1">
            {subtitle} &middot; Wedding day Saturday 10 October{countdown}
          </p>
        </div>
        {nextEvent && (
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-ivory-dark bg-white px-3 py-2 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray-light">Next up</span>
            <span className="font-semibold text-gold whitespace-nowrap">{shortDayLabel(nextEvent.event_date)}</span>
            {nextTime && <span className="text-warm-gray whitespace-nowrap">{nextTime}</span>}
            <span className="truncate text-warm-gray">{nextEvent.title}</span>
          </div>
        )}
      </div>

      {loadState === 'missing-table' && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">The calendar table hasn&apos;t been created yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs">supabase-calendar.sql</code> (in the
            wedding-planner folder) in the Supabase SQL Editor, then reload this page. Events can&apos;t be saved until then.
          </p>
        </div>
      )}
      {loadState === 'error' && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn&apos;t load events: {loadMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-ivory-dark bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-ivory-dark bg-ivory/60">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[10px] md:text-xs font-semibold uppercase tracking-wider text-warm-gray-light"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-ivory-dark [grid-auto-rows:minmax(3.5rem,auto)] md:[grid-auto-rows:minmax(8.5rem,auto)]">
          {Array.from({ length: TOTAL_CELLS }, (_, i) => {
            const day = i - LEADING_BLANKS + 1;
            if (day < 1 || day > DAYS_IN_MONTH) return <div key={`blank-${i}`} className="bg-ivory/50" />;
            const key = dayKey(day);
            const inCell = sheetDay === null; // the editor lives in the sheet while one is open
            return (
              <DayCell
                key={key}
                dateKey={key}
                day={day}
                events={byDay[key] ?? []}
                isToday={today === key}
                isPast={today !== null && key < today}
                isWedding={key === WEDDING_DAY}
                editingId={inCell && editor?.mode === 'edit' ? editor.event.id : null}
                addingHere={inCell && editor?.mode === 'add' && editor.date === key}
                editorNode={inCell ? editorNode(true) : null}
                onAdd={() => openAdd(key)}
                onEdit={openEdit}
                onOpenSheet={() => openSheet(key)}
              />
            );
          })}
        </div>
      </div>

      <p className="hidden md:block mt-3 text-xs text-warm-gray-light">
        Click a day to add an event, or click an event to change or delete it.
      </p>
      <p className="md:hidden mt-3 text-xs text-warm-gray-light">Tap a day to see or add events.</p>

      {/* Phones: one day at a time in a bottom sheet (centered dialog if the window is wide) */}
      {sheetDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeSheet} />
          <div className="cal-sheet relative flex w-full max-h-[92dvh] flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-ivory-dark px-5 pt-4 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-gold">{dayLabel(sheetDay)}</h3>
                {sheetDay === WEDDING_DAY && (
                  <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gold">
                    <Heart size={11} fill="currentColor" /> Wedding day
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Close"
                className="-mr-2 p-2 text-warm-gray-light hover:text-warm-gray"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {sheetEvents.length === 0 && editor?.mode !== 'add' && (
                <p className="text-sm text-warm-gray-light">Nothing planned for this day yet.</p>
              )}
              {sheetEvents.map((ev) =>
                editor?.mode === 'edit' && editor.event.id === ev.id ? (
                  <div key={ev.id}>{editorNode(false)}</div>
                ) : (
                  <EventRow key={ev.id} event={ev} onClick={() => openEdit(ev)} />
                ),
              )}
              {editor?.mode === 'add' ? (
                <div>{editorNode(false)}</div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAdd(sheetDay)}
                  className="btn-outline flex w-full items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add event
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCell({
  dateKey,
  day,
  events,
  isToday,
  isPast,
  isWedding,
  editingId,
  addingHere,
  editorNode,
  onAdd,
  onEdit,
  onOpenSheet,
}: {
  dateKey: string;
  day: number;
  events: CalendarEvent[];
  isToday: boolean;
  isPast: boolean;
  isWedding: boolean;
  editingId: string | null;
  addingHere: boolean;
  editorNode: React.ReactNode;
  onAdd: () => void;
  onEdit: (event: CalendarEvent) => void;
  onOpenSheet: () => void;
}) {
  const label = dayLabel(dateKey);
  const numberClass = isToday
    ? 'bg-gold text-white'
    : isWedding
    ? 'text-gold ring-1 ring-gold'
    : isPast
    ? 'text-warm-gray-light'
    : 'text-warm-gray';

  return (
    <div
      className={`group relative flex min-w-0 flex-col p-1 md:p-2 ${isWedding ? 'bg-gold/10' : 'bg-white'}`}
      onClick={(e) => {
        // Desktop: clicking empty space in the day adds an event. Anything interactive handles itself.
        if ((e.target as HTMLElement).closest('button, form, a, input, textarea')) return;
        onAdd();
      }}
    >
      {/* Phones: the whole day is one tap target that opens the day sheet (gone from md up). */}
      <button
        type="button"
        className="md:hidden absolute inset-0 z-10"
        aria-label={`${label}, ${events.length} ${events.length === 1 ? 'event' : 'events'}`}
        onClick={onOpenSheet}
      />

      <div className="flex items-center justify-between gap-1">
        <span
          className={`inline-flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full text-xs md:text-sm font-semibold ${numberClass}`}
        >
          {day}
        </span>
        <span className="flex items-center gap-1">
          {isWedding && <Heart size={10} fill="currentColor" className="text-gold" />}
          <button
            type="button"
            aria-label={`Add event on ${label}`}
            onClick={onAdd}
            className="hidden md:inline-flex h-6 w-6 items-center justify-center rounded-md text-warm-gray-light opacity-0 transition-opacity hover:bg-gold/10 hover:text-gold focus:opacity-100 group-hover:opacity-100"
          >
            <Plus size={14} />
          </button>
        </span>
      </div>

      {isWedding && (
        <span className="hidden md:inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold whitespace-nowrap">
          Wedding day
        </span>
      )}

      {/* md+: the day's events, with the add/edit form inline */}
      <div className="hidden md:flex flex-col gap-1 mt-1">
        {events.map((ev) =>
          editingId === ev.id ? (
            <div key={ev.id}>{editorNode}</div>
          ) : (
            <EventChip key={ev.id} event={ev} muted={isPast} onClick={() => onEdit(ev)} />
          ),
        )}
        {addingHere && <div>{editorNode}</div>}
      </div>

      {/* phones: dots only; the sheet has the details */}
      {events.length > 0 && (
        <div className="md:hidden mt-auto flex flex-wrap items-center gap-0.5 pt-1">
          {events.slice(0, 3).map((ev) => (
            <span key={ev.id} className="h-1.5 w-1.5 rounded-full bg-gold" />
          ))}
          {events.length > 3 && (
            <span className="text-[9px] font-semibold leading-none text-gold">+{events.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

function EventChip({ event, muted, onClick }: { event: CalendarEvent; muted: boolean; onClick: () => void }) {
  const time = formatTime(event.event_time);
  return (
    <button
      type="button"
      onClick={onClick}
      title={[time, event.title, event.description].filter(Boolean).join(' · ')}
      className={`w-full min-w-0 rounded-md border-l-2 border-gold bg-gold/10 px-1.5 py-1 text-left transition-colors hover:bg-gold/20 ${
        muted ? 'opacity-70' : ''
      }`}
    >
      {time && <span className="block text-[10px] font-semibold leading-tight text-gold tabular-nums">{time}</span>}
      <span className="block break-words text-xs font-medium leading-snug">{event.title}</span>
      {event.description && (
        <span className="block break-words text-[11px] leading-snug text-warm-gray-light line-clamp-2 whitespace-pre-line">
          {event.description}
        </span>
      )}
    </button>
  );
}

function EventRow({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const time = formatTime(event.event_time);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-ivory-dark bg-ivory/40 px-4 py-3 text-left transition-colors hover:border-gold"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="break-words text-sm font-semibold">{event.title}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums text-gold">
          <Clock size={11} />
          {time ?? 'No time'}
        </span>
      </span>
      {event.description && (
        <span className="mt-1 block whitespace-pre-line text-sm text-warm-gray-light">{event.description}</span>
      )}
    </button>
  );
}

function EventForm({
  initial,
  mode,
  dense,
  saving,
  error,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: EventFormValues;
  mode: 'add' | 'edit';
  dense: boolean;
  saving: boolean;
  error: string;
  onSave: (values: EventFormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const formRef = useRef<HTMLFormElement>(null);
  const set = (patch: Partial<EventFormValues>) => setValues((v) => ({ ...v, ...patch }));

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(values);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className={`cal-form rounded-lg border border-gold/40 bg-white ${
        dense ? 'cal-form-dense space-y-1.5 p-1.5 shadow-sm' : 'space-y-3 p-4'
      }`}
    >
      {mode === 'edit' && (
        <label className="block">
          <span className="cal-label">Day</span>
          <input
            type="date"
            min={FIRST_DAY}
            max={LAST_DAY}
            required
            value={values.date}
            onChange={(e) => set({ date: e.target.value || values.date })}
          />
        </label>
      )}
      <label className="block">
        <span className="cal-label">Time</span>
        <input type="time" value={values.time} onChange={(e) => set({ time: e.target.value })} />
      </label>
      <label className="block">
        <span className="cal-label">Event *</span>
        <input
          type="text"
          required
          autoFocus
          value={values.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="e.g. Cake tasting"
        />
      </label>
      <label className="block">
        <span className="cal-label">Description</span>
        <textarea
          rows={dense ? 2 : 3}
          value={values.description}
          onChange={(e) => set({ description: e.target.value })}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') formRef.current?.requestSubmit();
          }}
          placeholder="Where, who, what to bring…"
        />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2 pt-0.5">
        <button type="submit" className="btn-gold" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn-outline" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete event"
            className="ml-auto p-1.5 text-warm-gray-light transition-colors hover:text-red-500"
          >
            <Trash2 size={dense ? 14 : 16} />
          </button>
        )}
      </div>
    </form>
  );
}
