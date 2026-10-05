'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { Car, Clock, MapPin, Pencil, Phone, StickyNote, User } from 'lucide-react';
import {
  AgendaItem,
  VEHICLE_STYLES,
  WEDDING_DATE,
  clockParts,
  contactParts,
  formatRange,
  minutesOf,
  sortAgenda,
  vehiclesOf,
} from '@/lib/agenda';

// Minutes since midnight while it is the wedding day on this phone, otherwise null.
// The snapshot is a string so consecutive reads within a minute compare equal.
function nowSnapshot(): string {
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return key === WEDDING_DATE ? String(d.getHours() * 60 + d.getMinutes()) : '';
}
function subscribeMinute(onChange: () => void) {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
}
function useWeddingDayNow(): number | null {
  const snap = useSyncExternalStore(subscribeMinute, nowSnapshot, () => '');
  return snap === '' ? null : Number(snap);
}

/**
 * The agenda as a phone-first timeline with one filter button per vehicle.
 * Read-only unless onEdit is given (the planner passes it; the vendor link does not).
 */
export default function AgendaView({
  items,
  onEdit,
  stickyTop = 'top-0',
}: {
  items: AgendaItem[];
  onEdit?: (item: AgendaItem) => void;
  /** Tailwind top-* class for the sticky filter bar (below the planner navbar: top-16). */
  stickyTop?: string;
}) {
  const [vehicle, setVehicle] = useState<string | null>(null);
  const now = useWeddingDayNow();

  const sorted = useMemo(() => sortAgenda(items), [items]);
  const vehicles = useMemo(() => vehiclesOf(items), [items]);
  const styleOf = useMemo(() => {
    const map = new Map(vehicles.map((v, i) => [v.name, VEHICLE_STYLES[i % VEHICLE_STYLES.length]]));
    return (name: string) => map.get(name.trim());
  }, [vehicles]);

  // A filter that no longer matches anything (vehicle renamed/removed) falls back to everything.
  const active = vehicle && vehicles.some((v) => v.name === vehicle) ? vehicle : null;
  const shown = active ? sorted.filter((i) => i.kind === 'step' && i.vehicle.trim() === active) : sorted;
  const nextId = now === null ? null : shown.find((i) => i.kind === 'step' && minutesOf(i.start_time) >= now)?.id ?? null;

  return (
    <div>
      {vehicles.length > 0 && (
        <div className={`sticky ${stickyTop} z-30 -mx-4 mb-4 border-b border-ivory-dark bg-ivory/95 px-4 py-3 backdrop-blur`}>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-warm-gray-light">
            <Car size={12} /> Filter by vehicle
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            <FilterButton label="Everything" count={sorted.length} on={active === null} onClick={() => setVehicle(null)} />
            {vehicles.map((v) => {
              const style = styleOf(v.name);
              return (
                <FilterButton
                  key={v.name}
                  label={v.name}
                  count={v.count}
                  on={active === v.name}
                  onClass={style?.on}
                  dotClass={style?.dot}
                  onClick={() => setVehicle(active === v.name ? null : v.name)}
                />
              );
            })}
          </div>
        </div>
      )}

      {active && (
        <p className="mb-3 text-sm text-warm-gray">
          <span className="font-semibold">{active}</span> · {shown.length} {shown.length === 1 ? 'trip' : 'trips'}, in order
        </p>
      )}

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-warm-gray-light">Nothing on the agenda yet.</p>
      ) : (
        <ol className="relative">
          {shown.map((item) =>
            item.kind === 'block' ? (
              <BlockRow key={item.id} item={item} onEdit={onEdit} />
            ) : (
              <StepRow
                key={item.id}
                item={item}
                vehicleStyle={styleOf(item.vehicle)}
                past={now !== null && minutesOf(item.start_time) < now && item.id !== nextId}
                isNext={item.id === nextId}
                onEdit={onEdit}
              />
            ),
          )}
          <li className="flex gap-3 pt-1">
            <div className="w-14 shrink-0" />
            <p className="pl-5 text-xs font-semibold uppercase tracking-wider text-warm-gray-light">End of the event</p>
          </li>
        </ol>
      )}
    </div>
  );
}

function FilterButton({
  label,
  count,
  on,
  onClass = 'bg-gold text-white border-gold',
  dotClass,
  onClick,
}: {
  label: string;
  count: number;
  on: boolean;
  onClass?: string;
  dotClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
        on ? onClass : 'border-ivory-dark bg-white text-warm-gray hover:border-gold'
      }`}
    >
      {dotClass && !on && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
      {label}
      <span className={on ? 'text-white/80' : 'text-warm-gray-light'}>{count}</span>
    </button>
  );
}

function TimeColumn({ time }: { time: string }) {
  const { clock, meridiem } = clockParts(time);
  return (
    <div className="w-14 shrink-0 pt-3 text-right">
      <div className="text-[15px] font-semibold leading-none tabular-nums text-warm-gray">{clock}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-warm-gray-light">{meridiem}</div>
    </div>
  );
}

function StepRow({
  item,
  vehicleStyle,
  past,
  isNext,
  onEdit,
}: {
  item: AgendaItem;
  vehicleStyle?: (typeof VEHICLE_STYLES)[number];
  past: boolean;
  isNext: boolean;
  onEdit?: (item: AgendaItem) => void;
}) {
  return (
    <li className={`flex gap-3 ${past ? 'opacity-50' : ''}`}>
      <TimeColumn time={item.start_time} />
      <div className="relative flex-1 border-l-2 border-ivory-dark pb-3 pl-5">
        <span
          className={`absolute -left-[7px] top-4 h-3 w-3 rounded-full border-2 border-ivory ${
            isNext ? 'bg-gold ring-4 ring-gold/20' : vehicleStyle?.dot ?? 'bg-warm-gray-light'
          }`}
        />
        <div
          className={`rounded-xl border bg-white p-3.5 shadow-sm ${isNext ? 'border-gold ring-1 ring-gold/30' : 'border-ivory-dark'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {isNext && (
                <span className="mb-1 inline-block rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Next
                </span>
              )}
              <p className="text-[15px] font-semibold leading-snug text-[#3d3530]">{item.event}</p>
              {item.who && (
                <p className="mt-0.5 flex items-start gap-1.5 text-sm text-warm-gray">
                  <User size={13} className="mt-[3px] shrink-0 text-warm-gray-light" />
                  <span>{item.who}</span>
                </p>
              )}
            </div>
            {onEdit && <EditButton onClick={() => onEdit(item)} />}
          </div>
          <Details item={item} vehicleChip={vehicleStyle?.chip} />
        </div>
      </div>
    </li>
  );
}

function BlockRow({ item, onEdit }: { item: AgendaItem; onEdit?: (item: AgendaItem) => void }) {
  return (
    <li className="flex gap-3">
      <TimeColumn time={item.start_time} />
      <div className="relative flex-1 border-l-2 border-gold/40 pb-3 pl-5">
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-dark">
                <Clock size={12} /> {formatRange(item.start_time, item.end_time)}
              </p>
              <p className="mt-1 text-base font-semibold leading-snug text-[#3d3530]">{item.event}</p>
              {item.who && <p className="mt-0.5 text-sm text-warm-gray">{item.who}</p>}
            </div>
            {onEdit && <EditButton onClick={() => onEdit(item)} />}
          </div>
          <Details item={item} />
        </div>
      </div>
    </li>
  );
}

function Details({ item, vehicleChip }: { item: AgendaItem; vehicleChip?: string }) {
  const hasAny = item.vehicle || item.location_name || item.location_url || item.contact || item.notes;
  if (!hasAny) return null;
  return (
    <div className="mt-2.5 space-y-2">
      {(item.vehicle || item.location_name || item.location_url) && (
        <div className="flex flex-wrap items-center gap-2">
          {item.vehicle && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                vehicleChip ?? 'border-ivory-dark bg-ivory text-warm-gray'
              }`}
            >
              <Car size={12} /> {item.vehicle}
            </span>
          )}
          {item.location_url ? (
            <a
              href={item.location_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-gold/40 bg-white px-2.5 py-1 text-xs font-medium text-gold-dark hover:bg-gold/10"
            >
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{item.location_name || 'Open in Maps'}</span>
            </a>
          ) : (
            item.location_name && (
              <span className="inline-flex items-center gap-1 text-xs text-warm-gray-light">
                <MapPin size={12} /> {item.location_name}
              </span>
            )
          )}
        </div>
      )}
      {item.contact && (
        <p className="flex items-start gap-1.5 text-sm text-warm-gray">
          <Phone size={13} className="mt-[3px] shrink-0 text-warm-gray-light" />
          <span>
            {contactParts(item.contact).map((part, i) =>
              part.tel ? (
                <a key={i} href={`tel:${part.tel}`} className="whitespace-nowrap font-medium text-gold-dark underline-offset-2 hover:underline">
                  {part.text}
                </a>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </span>
        </p>
      )}
      {item.notes && (
        <p className="flex items-start gap-1.5 text-sm text-warm-gray-light">
          <StickyNote size={13} className="mt-[3px] shrink-0" />
          <span className="whitespace-pre-line">{item.notes}</span>
        </p>
      )}
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Edit"
      className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-warm-gray-light transition-colors hover:bg-gold/10 hover:text-gold"
    >
      <Pencil size={15} />
    </button>
  );
}
