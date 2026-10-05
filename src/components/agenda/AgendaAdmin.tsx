'use client';

import { useState } from 'react';
import { Check, ExternalLink, Plus, Share2, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AgendaItem, AgendaLoad, isMissingTable, sortAgenda, vehiclesOf } from '@/lib/agenda';
import AgendaView from './AgendaView';

type FormValues = {
  kind: 'step' | 'block';
  start: string;
  end: string;
  who: string;
  event: string;
  vehicle: string;
  location_name: string;
  location_url: string;
  contact: string;
  notes: string;
};

const EMPTY: FormValues = {
  kind: 'step', start: '', end: '', who: '', event: '', vehicle: '',
  location_name: '', location_url: '', contact: '', notes: '',
};

function toForm(item: AgendaItem): FormValues {
  return {
    kind: item.kind,
    start: item.start_time.slice(0, 5),
    end: item.end_time ? item.end_time.slice(0, 5) : '',
    who: item.who,
    event: item.event,
    vehicle: item.vehicle,
    location_name: item.location_name,
    location_url: item.location_url,
    contact: item.contact,
    notes: item.notes,
  };
}

type Editor = { mode: 'add' } | { mode: 'edit'; item: AgendaItem };

export default function AgendaAdmin({ initial, sharePath }: { initial: AgendaLoad; sharePath: string | null }) {
  const [items, setItems] = useState<AgendaItem[]>(initial.items);
  const [loadError, setLoadError] = useState(initial.error);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [shared, setShared] = useState('');

  async function refresh() {
    const { data, error } = await supabase.from('agenda_items').select('*');
    if (error) {
      setLoadError(isMissingTable(error) ? 'missing' : error.message);
      return;
    }
    setLoadError(null);
    setItems(sortAgenda(data ?? []));
  }

  function openAdd() {
    setForm(EMPTY);
    setFormError('');
    setEditor({ mode: 'add' });
  }

  function openEdit(item: AgendaItem) {
    setForm(toForm(item));
    setFormError('');
    setEditor({ mode: 'edit', item });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editor) return;
    const event = form.event.trim();
    if (!form.start || !event) return;
    if (form.kind === 'block' && form.end && form.end <= form.start) {
      setFormError('The end time must be after the start time.');
      return;
    }
    const url = form.location_url.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setFormError('The map link should start with https:// (paste it from Google Maps → Share).');
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      kind: form.kind,
      start_time: form.start,
      end_time: form.kind === 'block' && form.end ? form.end : null,
      who: form.who.trim(),
      event,
      vehicle: form.kind === 'block' ? '' : form.vehicle.trim(),
      location_name: form.location_name.trim(),
      location_url: url,
      contact: form.contact.trim(),
      notes: form.notes.trim(),
    };
    // New items go after anything else already planned for the same minute.
    const nextOrder = items.reduce((max, i) => Math.max(max, i.sort_order), 0) + 10;
    const { error } =
      editor.mode === 'edit'
        ? await supabase.from('agenda_items').update(payload).eq('id', editor.item.id)
        : await supabase.from('agenda_items').insert({ ...payload, sort_order: nextOrder });
    setSaving(false);
    if (error) {
      setFormError(`Could not save: ${error.message}`);
      return;
    }
    setEditor(null);
    await refresh();
  }

  async function remove() {
    if (editor?.mode !== 'edit') return;
    if (!confirm(`Delete "${editor.item.event}"?`)) return;
    const { error } = await supabase.from('agenda_items').delete().eq('id', editor.item.id);
    if (error) {
      setFormError(`Could not delete: ${error.message}`);
      return;
    }
    setEditor(null);
    await refresh();
  }

  async function share() {
    if (!sharePath) return;
    const url = `${window.location.origin}${sharePath}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Amaya & Shavin – Wedding Day Agenda', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared('Link copied');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // closed the share sheet
      setShared(url); // clipboard blocked: show it so it can be copied by hand
    }
  }

  const vehicleOptions = vehiclesOf(items).map((v) => v.name);
  const set = (patch: Partial<FormValues>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gold">Wedding Day</h1>
        <p className="mt-1 text-sm text-warm-gray-light">
          Saturday 10 October 2026 &middot; {items.length} items
        </p>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className="btn-gold flex items-center gap-2" onClick={openAdd} disabled={loadError === 'missing'}>
          <Plus size={16} /> Add item
        </button>
        {sharePath && (
          <>
            <button type="button" className="btn-outline flex items-center gap-2" onClick={share}>
              <Share2 size={15} /> Share with vendors
            </button>
            <a href={sharePath} target="_blank" rel="noopener noreferrer" className="btn-outline flex items-center gap-2">
              <ExternalLink size={15} /> Vendor view
            </a>
          </>
        )}
      </div>
      {shared && (
        <p className="mb-2 flex items-center gap-1.5 break-all text-xs text-green-700">
          <Check size={13} className="shrink-0" /> {shared}
        </p>
      )}
      <p className="mb-4 text-xs text-warm-gray-light">
        Vendors get a read-only page: no editing, no other planner pages. Changes here show up on it straight away.
      </p>

      {loadError === 'missing' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">The agenda table hasn&apos;t been created yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs">supabase-agenda.sql</code> in the Supabase SQL
            Editor. It creates the table and fills it with the agenda, then reload this page.
          </p>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Couldn&apos;t load the agenda: {loadError}
        </div>
      ) : (
        <AgendaView items={items} onEdit={openEdit} stickyTop="top-16" />
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditor(null)} />
          <form
            onSubmit={save}
            className="agenda-modal relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-ivory-dark px-5 pb-3 pt-4">
              <h3 className="text-lg font-semibold text-gold">{editor.mode === 'add' ? 'New agenda item' : 'Edit agenda item'}</h3>
              <button type="button" onClick={() => setEditor(null)} aria-label="Close" className="-mr-2 p-2 text-warm-gray-light hover:text-warm-gray">
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-ivory-dark/60 p-1">
                {(['step', 'block'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set({ kind: k })}
                    className={`rounded-md py-2 text-sm font-medium transition-colors ${
                      form.kind === k ? 'bg-white text-gold shadow-sm' : 'text-warm-gray'
                    }`}
                  >
                    {k === 'step' ? 'Moment' : 'Time block'}
                  </button>
                ))}
              </div>
              <p className="-mt-2 text-xs text-warm-gray-light">
                {form.kind === 'step'
                  ? 'Something that happens at a set time, like a pickup or an arrival.'
                  : 'A stretch of time, like dressing, the Mass or dinner. Shown as a highlighted band.'}
              </p>

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <Field label="Time *">
                  <input type="time" required value={form.start} onChange={(e) => set({ start: e.target.value })} />
                </Field>
                {form.kind === 'block' ? (
                  <Field label="Until">
                    <input type="time" value={form.end} onChange={(e) => set({ end: e.target.value })} />
                  </Field>
                ) : (
                  <Field label="Vehicle">
                    <input
                      type="text"
                      list="agenda-vehicles"
                      value={form.vehicle}
                      onChange={(e) => set({ vehicle: e.target.value })}
                      placeholder="e.g. KDH High Roof"
                    />
                    <datalist id="agenda-vehicles">
                      {vehicleOptions.map((v) => <option key={v} value={v} />)}
                    </datalist>
                  </Field>
                )}
              </div>
              <Field label="What happens *">
                <input type="text" required value={form.event} onChange={(e) => set({ event: e.target.value })} placeholder="e.g. Arrive at Lily Pod" />
              </Field>
              <Field label="Who">
                <input type="text" value={form.who} onChange={(e) => set({ who: e.target.value })} placeholder="e.g. Bride's parents" />
              </Field>
              <Field label="Location name">
                <input type="text" value={form.location_name} onChange={(e) => set({ location_name: e.target.value })} placeholder="e.g. Lily Pod, Bolgoda" />
              </Field>
              <Field label="Google Maps link">
                <input type="url" inputMode="url" value={form.location_url} onChange={(e) => set({ location_url: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
              </Field>
              <Field label="Contact">
                <input type="text" value={form.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="e.g. Heshan +94 77 267 2644" />
              </Field>
              <Field label="Notes">
                <textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="What to bring, who to meet…" />
              </Field>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-3 border-t border-ivory-dark px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <button type="submit" className="btn-gold flex-1" disabled={saving}>
                {saving ? 'Saving…' : editor.mode === 'add' ? 'Add to agenda' : 'Save changes'}
              </button>
              <button type="button" className="btn-outline flex-1" onClick={() => setEditor(null)}>
                Cancel
              </button>
              {editor.mode === 'edit' && (
                <button type="button" onClick={remove} aria-label="Delete item" className="p-2 text-warm-gray-light hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-warm-gray">{label}</span>
      {children}
    </label>
  );
}
