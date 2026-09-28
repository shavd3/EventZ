import { ExternalLink } from 'lucide-react';

/**
 * The wedding-day agenda is kept outside the planner: a shared sheet published as a static
 * page on surge. This page frames that page so it sits alongside everything else; the button
 * opens the same URL directly, which is the fallback whenever the frame can't load it.
 * The old hand-edited timeline (schedule_items) is gone from the UI; the table still exists.
 */
const AGENDA_URL = 'https://amaya-shavin-agenda.surge.sh/';

export default function SchedulePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col px-4 py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gold">Wedding Day</h1>
          <p className="mt-1 text-sm text-warm-gray-light">
            Saturday, 10th October 2026 &middot; the shared agenda, live from its own page
          </p>
        </div>
        <a
          href={AGENDA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold inline-flex items-center gap-2"
        >
          Open agenda <ExternalLink size={14} />
        </a>
      </div>

      <iframe
        src={AGENDA_URL}
        title="Wedding day agenda"
        className="w-full flex-1 min-h-[32rem] rounded-xl border border-ivory-dark bg-white shadow-sm"
      />

      <p className="mt-3 text-xs text-warm-gray-light">
        If the agenda doesn&apos;t appear above, use <span className="font-medium">Open agenda</span> to view it in
        its own tab.
      </p>
    </div>
  );
}
