'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Vendor } from '@/lib/agenda';

type Values = Pick<Vendor, 'section' | 'role' | 'name' | 'contact_person' | 'phone' | 'location_url' | 'notes'>;

/** Add/edit bottom sheet for one vendor. Planner only: it writes to Supabase directly. */
export default function VendorEditor({
  vendor,
  sections,
  nextOrder,
  onClose,
  onSaved,
}: {
  vendor: Vendor | null;
  sections: string[];
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Values>(
    vendor ?? { section: '', role: '', name: '', contact_person: '', phone: '', location_url: '', notes: '' },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<Values>) => setValues((v) => ({ ...v, ...patch }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = values.name.trim();
    if (!name) return;
    const url = values.location_url.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setError('The map link should start with https:// (paste it from Google Maps → Share).');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      section: values.section.trim(),
      role: values.role.trim(),
      name,
      contact_person: values.contact_person.trim(),
      phone: values.phone.trim(),
      location_url: url,
      notes: values.notes.trim(),
    };
    const { error: err } = vendor
      ? await supabase.from('wedding_vendors').update(payload).eq('id', vendor.id)
      : await supabase.from('wedding_vendors').insert({ ...payload, sort_order: nextOrder });
    setSaving(false);
    if (err) {
      setError(`Could not save: ${err.message}`);
      return;
    }
    onSaved();
  }

  async function remove() {
    if (!vendor || !confirm(`Delete ${vendor.name}?`)) return;
    const { error: err } = await supabase.from('wedding_vendors').delete().eq('id', vendor.id);
    if (err) {
      setError(`Could not delete: ${err.message}`);
      return;
    }
    onSaved();
  }

  const field = (label: string, node: React.ReactNode) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-warm-gray">{label}</span>
      {node}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={save} className="agenda-modal relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-ivory-dark px-5 pb-3 pt-4">
          <h3 className="text-lg font-semibold text-gold">{vendor ? 'Edit vendor' : 'New vendor'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 p-2 text-warm-gray-light hover:text-warm-gray">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {field('Name *', <input type="text" required value={values.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Eterno Weddings" />)}
          {field('What they do', <input type="text" value={values.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Photographer" />)}
          {field('Group', (
            <>
              <input type="text" list="vendor-sections" value={values.section} onChange={(e) => set({ section: e.target.value })} placeholder="e.g. Photo & video" />
              <datalist id="vendor-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
            </>
          ))}
          {field('Contact person', <input type="text" value={values.contact_person} onChange={(e) => set({ contact_person: e.target.value })} placeholder="e.g. Disitha" />)}
          {field('Phone', <input type="tel" value={values.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+94 71 358 2260 · second number" />)}
          {field('Google Maps link', <input type="url" inputMode="url" value={values.location_url} onChange={(e) => set({ location_url: e.target.value })} placeholder="https://maps.app.goo.gl/…" />)}
          {field('Notes', <textarea rows={3} value={values.notes} onChange={(e) => set({ notes: e.target.value })} />)}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-ivory-dark px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <button type="submit" className="btn-gold flex-1" disabled={saving}>
            {saving ? 'Saving…' : vendor ? 'Save changes' : 'Add vendor'}
          </button>
          <button type="button" className="btn-outline flex-1" onClick={onClose}>Cancel</button>
          {vendor && (
            <button type="button" onClick={remove} aria-label="Delete vendor" className="p-2 text-warm-gray-light hover:text-red-500">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
