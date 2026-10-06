// Server-side agenda read, shared by the Wedding Day page and the vendor link.
// Imported only from server components, so the Supabase key stays out of the vendor bundle.
import { supabase } from '@/lib/supabase';
import { AgendaLoad, VendorLoad, isMissingTable, sortAgenda, sortVendors } from '@/lib/agenda';

export async function loadAgenda(): Promise<AgendaLoad> {
  const { data, error } = await supabase
    .from('agenda_items')
    .select('*')
    .order('start_time', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) return { items: [], error: isMissingTable(error) ? 'missing' : error.message };
  return { items: sortAgenda(data ?? []), error: null };
}

export async function loadVendors(): Promise<VendorLoad> {
  const { data, error } = await supabase.from('wedding_vendors').select('*').order('sort_order', { ascending: true });
  if (error) return { vendors: [], error: isMissingTable(error) ? 'missing' : error.message };
  return { vendors: sortVendors(data ?? []), error: null };
}
