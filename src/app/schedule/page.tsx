import AgendaAdmin from '@/components/agenda/AgendaAdmin';
import { loadAgenda } from '@/lib/agenda-server';
import { agendaShareKey } from '@/lib/auth';

// Wedding Day: the editable agenda. Read on the server so the first paint already has it;
// edits then go straight to Supabase from the client like every other planner page.
export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const initial = await loadAgenda();
  const key = agendaShareKey();
  return <AgendaAdmin initial={initial} sharePath={key ? `/agenda/${key}` : null} />;
}
