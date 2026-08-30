import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { CrownSimpleIcon } from "@phosphor-icons/react/dist/csr/CrownSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { TableIcon } from "@phosphor-icons/react/dist/csr/Table";
import { UsersIcon } from "@phosphor-icons/react/dist/csr/Users";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type {
  ManagedRestaurant,
  Reservation,
  ReservationStatus,
  RestaurantBusinessProStatus,
  RestaurantReservationConfig,
  RestaurantReservationsBoard,
} from "@findeat/types";
import { CustomDropdown } from "../components/CustomDropdown";
import { request } from "../lib/api";
import { businessPaths, navigateTo } from "../lib/navigation";

const statusOptions: Array<{ value: ReservationStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NO_SHOW", label: "No-show" },
  { value: "CANCELLED", label: "Cancelled" },
];

const statusTone: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
  NO_SHOW: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200",
};

function localDay(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function moveDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDay(date);
}

function rangeForDay(day: string) {
  const from = new Date(`${day}T00:00:00`);
  const to = new Date(`${day}T00:00:00`);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function dateTimeValue(day: string) {
  const date = new Date(`${day}T19:00:00`);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function inputClass() {
  return "min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10";
}

type ReservationDraft = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  reservationTime: string;
  partySize: string;
  tableId: string;
  guestNotes: string;
  internalNotes: string;
};

function emptyReservation(day: string): ReservationDraft {
  return {
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    reservationTime: dateTimeValue(day),
    partySize: "2",
    tableId: "",
    guestNotes: "",
    internalNotes: "",
  };
}

export function ReservationsPage({ restaurant }: { restaurant: ManagedRestaurant }) {
  const [day, setDay] = useState(localDay);
  const [pro, setPro] = useState<RestaurantBusinessProStatus | null>(null);
  const [config, setConfig] = useState<RestaurantReservationConfig | null>(null);
  const [board, setBoard] = useState<RestaurantReservationsBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReservation, setShowReservation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => emptyReservation(day));
  const [tableDraft, setTableDraft] = useState({ name: "", area: "", seats: "2" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextPro = await request<RestaurantBusinessProStatus>(
        `/restaurants/${restaurant.id}/business-pro/status`,
        { cache: "reload" },
      );
      setPro(nextPro);
      if (!nextPro.hasProAccess) {
        setBoard(null);
        setConfig(null);
        setError("");
        return;
      }
      const range = rangeForDay(day);
      const [nextConfig, nextBoard] = await Promise.all([
        request<RestaurantReservationConfig>(
          `/restaurants/${restaurant.id}/reservation-config`,
          { cache: "reload" },
        ),
        request<RestaurantReservationsBoard>(
          `/restaurants/${restaurant.id}/reservations?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
          { cache: "reload" },
        ),
      ]);
      setConfig(nextConfig);
      setBoard(nextBoard);
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load reservations");
    } finally {
      setLoading(false);
    }
  }, [day, restaurant.id]);

  useEffect(() => {
    // The request initializes this server-backed workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const reservations = useMemo(
    () => board?.reservations ?? [],
    [board?.reservations],
  );
  const tables = board?.tables ?? [];
  const activeReservations = reservations.filter(
    (item) => item.status !== "CANCELLED" && item.status !== "NO_SHOW",
  );
  const summary = useMemo(
    () => ({
      bookings: activeReservations.length,
      covers: activeReservations.reduce((total, item) => total + item.partySize, 0),
      pending: reservations.filter((item) => item.status === "PENDING").length,
    }),
    [activeReservations, reservations],
  );

  async function updateReservation(
    reservation: Reservation,
    payload: Record<string, unknown>,
  ) {
    try {
      await request(
        `/restaurants/${restaurant.id}/reservations/${reservation.id}`,
        { method: "PATCH", body: JSON.stringify(payload) },
      );
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update reservation");
    }
  }

  async function createReservation(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await request(`/restaurants/${restaurant.id}/reservations/manage`, {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          reservationTime: new Date(draft.reservationTime).toISOString(),
          partySize: Number(draft.partySize),
          tableId: draft.tableId || undefined,
        }),
      });
      setShowReservation(false);
      setDraft(emptyReservation(day));
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not add reservation");
    } finally {
      setSaving(false);
    }
  }

  async function createTable(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await request(`/restaurants/${restaurant.id}/reservation-tables`, {
        method: "POST",
        body: JSON.stringify({
          name: tableDraft.name,
          area: tableDraft.area || undefined,
          seats: Number(tableDraft.seats),
        }),
      });
      setTableDraft({ name: "", area: "", seats: "2" });
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not add table");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      await request(`/restaurants/${restaurant.id}/reservation-config`, {
        method: "PATCH",
        body: JSON.stringify({
          provider: "FINDEAT",
          enabled: config.enabled,
          slotDurationMinutes: Number(config.slotDurationMinutes),
          bookingIntervalMinutes: Number(config.bookingIntervalMinutes),
          minPartySize: Number(config.minPartySize),
          maxPartySize: Number(config.maxPartySize),
          advanceBookingDays: Number(config.advanceBookingDays),
          minimumLeadMinutes: Number(config.minimumLeadMinutes),
          autoConfirm: config.autoConfirm,
        }),
      });
      setShowSettings(false);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save reservation settings");
    } finally {
      setSaving(false);
    }
  }

  if (!loading && pro && !pro.hasProAccess) {
    return (
      <div className="page-stack mx-auto grid w-full max-w-6xl gap-5 px-5 py-8">
        <section className="overflow-hidden rounded-3xl border border-line bg-[radial-gradient(circle_at_top_right,rgba(255,114,85,.24),transparent_42%),var(--surface)] p-8 max-[650px]:p-6">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent text-white">
            <CrownSimpleIcon size={26} weight="fill" />
          </span>
          <p className="mb-2 mt-7 text-xs font-black uppercase tracking-[0.16em] text-accent">Business Pro</p>
          <h1 className="m-0 max-w-2xl text-4xl font-black tracking-tight text-ink max-[650px]:text-3xl">Run reservations without sending guests somewhere else.</h1>
          <p className="mb-0 mt-4 max-w-2xl text-base leading-7 text-muted">Manage tables, bookings, guest notes, confirmations, no-shows, and daily covers directly inside FindEat.</p>
          <button className="mt-7 min-h-12 rounded-xl border-0 bg-accent px-5 font-black text-white transition hover:-translate-y-0.5" onClick={() => navigateTo(businessPaths.pro)}>Explore Business Pro</button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack mx-auto grid w-full max-w-7xl gap-5 px-5 py-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-accent">Reservations</p>
            <span className="rounded-md bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-800">PRO</span>
          </div>
          <h1 className="mb-0 mt-2 text-3xl font-black tracking-tight text-ink">Today’s floor, at a glance</h1>
          <p className="mb-0 mt-2 text-sm text-muted">Bookings, tables, guest requests, and service status in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 font-bold text-ink transition hover:bg-surface-hover" onClick={() => setShowSettings(true)}><SlidersHorizontalIcon size={18} /> Settings</button>
          <button className="flex min-h-11 items-center gap-2 rounded-xl border-0 bg-accent px-4 font-black text-white shadow-sm transition hover:-translate-y-0.5" onClick={() => { setDraft(emptyReservation(day)); setShowReservation(true); }}><PlusIcon size={18} weight="bold" /> Add reservation</button>
        </div>
      </section>

      {error ? <p className="m-0 rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-950/50 dark:text-red-200">{error}</p> : null}

      <section className="grid grid-cols-3 gap-3 max-[650px]:grid-cols-1">
        {[
          [CalendarBlankIcon, "Bookings", summary.bookings, "Active reservations"],
          [UsersIcon, "Covers", summary.covers, "Guests expected"],
          [ClockIcon, "Need attention", summary.pending, "Pending confirmation"],
        ].map(([Icon, label, value, detail]) => {
          const MetricIcon = Icon as typeof CalendarBlankIcon;
          return <article className="rounded-2xl border border-line bg-surface p-5" key={String(label)}><MetricIcon size={22} className="text-accent" weight="duotone" /><span className="mt-4 block text-xs font-bold text-muted">{String(label)}</span><strong className="mt-1 block text-3xl text-ink">{String(value)}</strong><small className="mt-1 block text-muted">{String(detail)}</small></article>;
        })}
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-line bg-surface p-2">
        <button className="grid size-10 place-items-center rounded-xl border-0 bg-transparent text-ink hover:bg-surface-hover" onClick={() => setDay(moveDay(day, -1))} aria-label="Previous day"><CaretLeftIcon size={20} /></button>
        <label className="font-black text-ink"><input className="sr-only" type="date" value={day} onChange={(event) => setDay(event.target.value)} />{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</label>
        <button className="grid size-10 place-items-center rounded-xl border-0 bg-transparent text-ink hover:bg-surface-hover" onClick={() => setDay(moveDay(day, 1))} aria-label="Next day"><CaretRightIcon size={20} /></button>
      </section>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(260px,.7fr)] gap-4 max-[900px]:grid-cols-1">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="m-0 text-lg font-black text-ink">Reservation list</h2><p className="mb-0 mt-1 text-xs text-muted">Ordered by arrival time</p></div><span className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-black text-muted">{reservations.length}</span></div>
          {loading ? <p className="p-6 text-sm text-muted">Loading reservations…</p> : reservations.length === 0 ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><CalendarBlankIcon className="mx-auto text-muted" size={36} weight="duotone" /><h3 className="mb-1 mt-4 text-ink">No bookings for this day</h3><p className="m-0 text-sm text-muted">Add a phone booking or choose another date.</p></div></div> : <div className="divide-y divide-line">{reservations.map((reservation) => {
            const guestName = reservation.guestName || reservation.user?.displayName || "Guest";
            return <article className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 max-[650px]:grid-cols-[62px_minmax(0,1fr)]" key={reservation.id}>
              <time className="text-lg font-black text-ink">{new Date(reservation.reservationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-ink">{guestName}</strong><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusTone[reservation.status]}`}>{statusOptions.find((item) => item.value === reservation.status)?.label}</span></div><p className="mb-0 mt-1 text-xs text-muted">{reservation.partySize} guests · {reservation.table?.name ?? "Unassigned"}{reservation.guestPhone ? ` · ${reservation.guestPhone}` : ""}</p>{reservation.guestNotes ? <p className="mb-0 mt-2 text-xs text-ink">“{reservation.guestNotes}”</p> : null}</div>
              <div className="w-36 max-[650px]:col-span-2 max-[650px]:w-full"><CustomDropdown ariaLabel={`Status for ${guestName}`} value={reservation.status} options={statusOptions} onChange={(value) => void updateReservation(reservation, { status: value })} /></div>
            </article>;
          })}</div>}
        </section>

        <aside className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between"><div><h2 className="m-0 text-lg font-black text-ink">Tables</h2><p className="mb-0 mt-1 text-xs text-muted">Your bookable floor</p></div><TableIcon size={24} className="text-accent" weight="duotone" /></div>
          <div className="mt-5 grid gap-2">{tables.length ? tables.map((table) => <div className={`flex items-center justify-between rounded-xl border border-line px-3 py-3 ${table.active ? "bg-surface-subtle" : "opacity-50"}`} key={table.id}><div><strong className="block text-sm text-ink">{table.name}</strong><small className="text-muted">{table.seats} seats{table.area ? ` · ${table.area}` : ""}</small></div><button className="rounded-lg border-0 bg-transparent px-2 py-1 text-xs font-bold text-muted hover:bg-surface-hover" onClick={() => void request(`/restaurants/${restaurant.id}/reservation-tables/${table.id}`, { method: "PATCH", body: JSON.stringify({ active: !table.active }) }).then(load)}>{table.active ? "Pause" : "Enable"}</button></div>) : <p className="rounded-xl bg-surface-subtle p-4 text-sm text-muted">Add tables before accepting native bookings.</p>}</div>
          <form className="mt-5 grid gap-2 border-t border-line pt-5" onSubmit={createTable}><h3 className="m-0 text-sm font-black text-ink">Add a table</h3><input required className={inputClass()} placeholder="Table name" value={tableDraft.name} onChange={(event) => setTableDraft((current) => ({ ...current, name: event.target.value }))} /><div className="grid grid-cols-[1fr_88px] gap-2"><input className={inputClass()} placeholder="Area (optional)" value={tableDraft.area} onChange={(event) => setTableDraft((current) => ({ ...current, area: event.target.value }))} /><input required min={1} max={100} type="number" className={inputClass()} aria-label="Seats" value={tableDraft.seats} onChange={(event) => setTableDraft((current) => ({ ...current, seats: event.target.value }))} /></div><button disabled={saving} className="min-h-11 rounded-xl border border-line bg-surface-subtle font-black text-ink transition hover:bg-surface-hover">Add table</button></form>
        </aside>
      </div>

      {showReservation ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReservation(false); }}><form className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-2xl" onSubmit={createReservation}><div className="flex items-start justify-between"><div><p className="m-0 text-xs font-black uppercase tracking-[.14em] text-accent">New booking</p><h2 className="mb-0 mt-2 text-2xl font-black text-ink">Add a reservation</h2></div><button type="button" className="grid size-10 place-items-center rounded-xl border border-line bg-transparent text-ink" onClick={() => setShowReservation(false)}><XIcon size={20} /></button></div><div className="mt-6 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1"><label className="grid gap-2 text-xs font-black text-ink">Guest name<input required className={inputClass()} value={draft.guestName} onChange={(event) => setDraft((current) => ({ ...current, guestName: event.target.value }))} /></label><label className="grid gap-2 text-xs font-black text-ink">Party size<input required min={1} max={100} type="number" className={inputClass()} value={draft.partySize} onChange={(event) => setDraft((current) => ({ ...current, partySize: event.target.value }))} /></label><label className="grid gap-2 text-xs font-black text-ink">Date and time<input required type="datetime-local" className={inputClass()} value={draft.reservationTime} onChange={(event) => setDraft((current) => ({ ...current, reservationTime: event.target.value }))} /></label><label className="grid gap-2 text-xs font-black text-ink">Table<select className={inputClass()} value={draft.tableId} onChange={(event) => setDraft((current) => ({ ...current, tableId: event.target.value }))}><option value="">Assign automatically</option>{tables.filter((table) => table.active).map((table) => <option value={table.id} key={table.id}>{table.name} · {table.seats} seats</option>)}</select></label><label className="grid gap-2 text-xs font-black text-ink">Phone<input className={inputClass()} value={draft.guestPhone} onChange={(event) => setDraft((current) => ({ ...current, guestPhone: event.target.value }))} /></label><label className="grid gap-2 text-xs font-black text-ink">Email<input type="email" className={inputClass()} value={draft.guestEmail} onChange={(event) => setDraft((current) => ({ ...current, guestEmail: event.target.value }))} /></label><label className="col-span-2 grid gap-2 text-xs font-black text-ink max-[600px]:col-span-1">Guest request<textarea rows={3} className={inputClass()} value={draft.guestNotes} onChange={(event) => setDraft((current) => ({ ...current, guestNotes: event.target.value }))} /></label><label className="col-span-2 grid gap-2 text-xs font-black text-ink max-[600px]:col-span-1">Internal note<textarea rows={3} className={inputClass()} value={draft.internalNotes} onChange={(event) => setDraft((current) => ({ ...current, internalNotes: event.target.value }))} /></label></div><button disabled={saving || tables.length === 0} className="mt-6 min-h-12 w-full rounded-xl border-0 bg-accent font-black text-white disabled:opacity-50">{saving ? "Adding…" : "Add reservation"}</button></form></div> : null}

      {showSettings && config ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false); }}><form className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-2xl" onSubmit={saveSettings}><div className="flex items-start justify-between"><div><p className="m-0 text-xs font-black uppercase tracking-[.14em] text-accent">Native booking</p><h2 className="mb-0 mt-2 text-2xl font-black text-ink">Reservation settings</h2></div><button type="button" className="grid size-10 place-items-center rounded-xl border border-line bg-transparent text-ink" onClick={() => setShowSettings(false)}><XIcon size={20} /></button></div><label className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-subtle p-4"><span><strong className="block text-sm text-ink">Accept FindEat reservations</strong><small className="mt-1 block text-muted">Show native booking to guests when tables are available.</small></span><input type="checkbox" checked={config.enabled && config.provider === "FINDEAT"} onChange={(event) => setConfig((current) => current ? { ...current, provider: "FINDEAT", enabled: event.target.checked } : current)} /></label><div className="mt-5 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">{[
        ["slotDurationMinutes", "Table duration", "minutes"], ["bookingIntervalMinutes", "Slot interval", "minutes"], ["minPartySize", "Minimum party", "guests"], ["maxPartySize", "Maximum party", "guests"], ["advanceBookingDays", "Booking window", "days"], ["minimumLeadMinutes", "Minimum notice", "minutes"],
      ].map(([key, label, suffix]) => <label className="grid gap-2 text-xs font-black text-ink" key={key}>{label}<div className="relative"><input min={key.includes("Party") ? 1 : 0} type="number" className={`${inputClass()} pr-20`} value={String(config[key as keyof RestaurantReservationConfig] ?? "")} onChange={(event) => setConfig((current) => current ? { ...current, [key]: Number(event.target.value) } : current)} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted">{suffix}</span></div></label>)}</div><label className="mt-5 flex items-center gap-3 rounded-xl border border-line p-4 text-sm font-bold text-ink"><input type="checkbox" checked={config.autoConfirm} onChange={(event) => setConfig((current) => current ? { ...current, autoConfirm: event.target.checked } : current)} /><span>Confirm bookings automatically</span></label><button disabled={saving} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-0 bg-accent font-black text-white"><CheckCircleIcon size={19} weight="fill" />{saving ? "Saving…" : "Save reservation settings"}</button></form></div> : null}
    </div>
  );
}
