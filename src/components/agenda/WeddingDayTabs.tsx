'use client';

import { useState } from 'react';
import { CalendarClock, Users } from 'lucide-react';

/** "Agenda | Vendors" switch shared by the planner page and the vendor link. */
export default function WeddingDayTabs({
  agenda,
  vendors,
  vendorCount,
}: {
  agenda: React.ReactNode;
  vendors: React.ReactNode;
  vendorCount: number;
}) {
  const [tab, setTab] = useState<'agenda' | 'vendors'>('agenda');
  const tabClass = (on: boolean) =>
    `flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${
      on ? 'bg-white text-gold shadow-sm' : 'text-warm-gray'
    }`;
  return (
    <div>
      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-ivory-dark/70 p-1">
        <button type="button" role="tab" aria-selected={tab === 'agenda'} className={tabClass(tab === 'agenda')} onClick={() => setTab('agenda')}>
          <CalendarClock size={15} /> Agenda
        </button>
        <button type="button" role="tab" aria-selected={tab === 'vendors'} className={tabClass(tab === 'vendors')} onClick={() => setTab('vendors')}>
          <Users size={15} /> Vendors <span className="text-warm-gray-light">{vendorCount}</span>
        </button>
      </div>
      {tab === 'agenda' ? agenda : vendors}
    </div>
  );
}
