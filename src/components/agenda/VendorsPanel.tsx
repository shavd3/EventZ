'use client';

import { MapPin, Pencil, Phone, Plus, StickyNote, User } from 'lucide-react';
import { Vendor, contactParts, sortVendors } from '@/lib/agenda';

/** Vendor contacts grouped by section, with big tap-to-call buttons. Read-only unless onEdit is given. */
export default function VendorsPanel({
  vendors,
  onEdit,
  onAdd,
}: {
  vendors: Vendor[];
  onEdit?: (vendor: Vendor) => void;
  onAdd?: () => void;
}) {
  const sections: { name: string; vendors: Vendor[] }[] = [];
  for (const v of sortVendors(vendors)) {
    const name = v.section.trim() || 'Other';
    const group = sections.find((s) => s.name === name);
    if (group) group.vendors.push(v);
    else sections.push({ name, vendors: [v] });
  }

  return (
    <div className="space-y-6">
      {onAdd && (
        <button type="button" className="btn-gold flex items-center gap-2" onClick={onAdd}>
          <Plus size={16} /> Add vendor
        </button>
      )}
      {sections.length === 0 && <p className="py-10 text-center text-sm text-warm-gray-light">No vendors added yet.</p>}
      {sections.map((section) => (
        <section key={section.name}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-warm-gray-light">{section.name}</h2>
          <ul className="space-y-2.5">
            {section.vendors.map((v) => (
              <li key={v.id} className="rounded-xl border border-ivory-dark bg-white p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {v.role && <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-dark">{v.role}</p>}
                    <p className="text-[15px] font-semibold leading-snug text-[#3d3530]">{v.name}</p>
                    {v.contact_person && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-warm-gray">
                        <User size={13} className="text-warm-gray-light" /> {v.contact_person}
                      </p>
                    )}
                  </div>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(v)}
                      aria-label="Edit"
                      className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-warm-gray-light hover:bg-gold/10 hover:text-gold"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
                {(v.phone || v.location_url) && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {contactParts(v.phone)
                      .filter((p) => p.tel)
                      .map((p) => (
                        <a
                          key={p.tel}
                          href={`tel:${p.tel}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-2 text-sm font-semibold tabular-nums text-white hover:bg-gold-dark"
                        >
                          <Phone size={13} /> {p.text}
                        </a>
                      ))}
                    {v.location_url && (
                      <a
                        href={v.location_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3.5 py-2 text-sm font-medium text-gold-dark hover:bg-gold/10"
                      >
                        <MapPin size={13} /> Map
                      </a>
                    )}
                  </div>
                )}
                {v.notes && (
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-warm-gray-light">
                    <StickyNote size={13} className="mt-[3px] shrink-0" />
                    <span className="whitespace-pre-line">{v.notes}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
