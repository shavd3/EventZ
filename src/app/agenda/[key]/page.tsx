import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import AgendaView from '@/components/agenda/AgendaView';
import { loadAgenda } from '@/lib/agenda-server';
import { agendaKeyMatches } from '@/lib/auth';

// The read-only vendor link. src/proxy.ts lets /agenda/* through without a planner session;
// the secret key in the URL is what grants access. This page renders on the server and hands
// plain data to the view, so no Supabase client or key reaches the vendor's browser.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Wedding Day Agenda · Amaya & Shavin',
  robots: { index: false, follow: false },
};

export default async function VendorAgendaPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!agendaKeyMatches(key)) notFound();

  const { items, error } = await loadAgenda();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-6">
      <header className="mb-4 flex items-center gap-3">
        <Image src="/logo.png" alt="" width={44} height={44} className="rounded-full" style={{ mixBlendMode: 'multiply' }} />
        <div>
          <h1 className="text-2xl font-bold leading-tight text-gold">Amaya &amp; Shavin</h1>
          <p className="text-sm text-warm-gray">Wedding day agenda &middot; Saturday 10 October 2026</p>
        </div>
      </header>
      <p className="mb-2 text-xs text-warm-gray-light">
        Tap a location to open it in Google Maps, or a number to call. This page always shows the latest plan.
      </p>

      {error ? (
        <p className="rounded-xl border border-ivory-dark bg-white px-4 py-6 text-center text-sm text-warm-gray">
          The agenda isn&apos;t available right now. Please check back shortly.
        </p>
      ) : (
        <AgendaView items={items} />
      )}
    </div>
  );
}
