import { AgendaItem, Vendor, formatRange, formatTime, sortVendors } from '@/lib/agenda';

/**
 * Paper version of the agenda. Rendered into <body> through a portal and hidden on screen;
 * the @media print rules in globals.css hide everything else and show only this.
 * With a vehicle filter it becomes that vehicle's run sheet (no vendor page).
 */
export default function AgendaPrint({
  items,
  vendors,
  vehicle,
}: {
  items: AgendaItem[];
  vendors: Vendor[];
  vehicle: string | null;
}) {
  const sections: { name: string; vendors: Vendor[] }[] = [];
  for (const v of sortVendors(vendors)) {
    const name = v.section.trim() || 'Other';
    const group = sections.find((s) => s.name === name);
    if (group) group.vendors.push(v);
    else sections.push({ name, vendors: [v] });
  }

  return (
    <div className="print-sheet">
      <header className="print-head">
        <h1>Amaya &amp; Shavin · Wedding day agenda</h1>
        <p>
          Saturday 10 October 2026
          {vehicle ? ` · Run sheet for ${vehicle} (${items.length} ${items.length === 1 ? 'trip' : 'trips'})` : ''}
        </p>
      </header>

      <table className="print-table">
        <thead>
          <tr>
            <th className="w-time">Time</th>
            <th>What happens</th>
            <th>Who</th>
            {!vehicle && <th>Vehicle</th>}
            <th>Location</th>
            <th>Contact &amp; notes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) =>
            item.kind === 'block' ? (
              <tr key={item.id} className="print-block">
                <td className="w-time">{formatRange(item.start_time, item.end_time)}</td>
                <td colSpan={vehicle ? 4 : 5}>
                  <strong>{item.event}</strong>
                  {item.location_name && ` · ${item.location_name}`}
                  {item.notes && ` · ${item.notes}`}
                </td>
              </tr>
            ) : (
              <tr key={item.id}>
                <td className="w-time">{formatTime(item.start_time)}</td>
                <td><strong>{item.event}</strong></td>
                <td>{item.who}</td>
                {!vehicle && <td>{item.vehicle}</td>}
                <td>
                  {item.location_name}
                  {item.location_url && <span className="print-url">{item.location_url.replace(/^https?:\/\//, '')}</span>}
                </td>
                <td>
                  {item.contact}
                  {item.contact && item.notes && <br />}
                  {item.notes && <span className="print-note">{item.notes}</span>}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      <p className="print-end">End of the event</p>

      {!vehicle && sections.length > 0 && (
        <section className="print-vendors">
          <h2>Vendor contacts</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>For</th>
                <th>Vendor</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Notes</th>
              </tr>
            </thead>
            {sections.map((s) => (
              <tbody key={s.name}>
                <tr className="print-section">
                  <td colSpan={5}>{s.name}</td>
                </tr>
                {s.vendors.map((v) => (
                  <tr key={v.id}>
                    <td>{v.role}</td>
                    <td><strong>{v.name}</strong></td>
                    <td>{v.contact_person}</td>
                    <td className="nowrap">{v.phone.split('·').map((p, i) => <div key={i}>{p.trim()}</div>)}</td>
                    <td>{v.notes}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </section>
      )}
    </div>
  );
}
