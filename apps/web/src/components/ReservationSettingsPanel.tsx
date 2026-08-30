import { useMemo, useState } from "react";
import { CalendarCheckIcon } from "@phosphor-icons/react";
import type {
  ManagedRestaurant,
  ReservationProvider,
  RestaurantReservationConfig,
} from "@findeat/types";
import { request } from "../lib/api";
import { CustomDropdown } from "./CustomDropdown";

const providerOptions = [
  { value: "NONE", label: "Choose a booking service" },
  { value: "FINDEAT", label: "FindEat native booking · Pro" },
  { value: "ONTOP", label: "Ontopo" },
  { value: "TABIT", label: "Tabit" },
  { value: "OTHER", label: "Other provider" },
];

function initialConfig(restaurant: ManagedRestaurant): RestaurantReservationConfig {
  if (restaurant.reservationConfig) return restaurant.reservationConfig;
  const provider: ReservationProvider = restaurant.ontopoUrl
    ? "ONTOP"
    : restaurant.tabitUrl
      ? "TABIT"
      : "NONE";
  return {
    id: null,
    restaurantId: restaurant.id,
    provider,
    integrationMode: "EXTERNAL_LINK",
    reservationUrl: restaurant.ontopoUrl ?? restaurant.tabitUrl ?? null,
    enabled: provider !== "NONE",
    slotDurationMinutes: 90,
    bookingIntervalMinutes: 30,
    minPartySize: 1,
    maxPartySize: 12,
    advanceBookingDays: 30,
    minimumLeadMinutes: 60,
    autoConfirm: true,
  };
}

export function ReservationSettingsPanel({
  restaurant,
  onSaved,
}: {
  restaurant: ManagedRestaurant;
  onSaved: () => Promise<void>;
}) {
  const initial = useMemo(() => initialConfig(restaurant), [restaurant]);
  const [provider, setProvider] = useState<ReservationProvider>(initial.provider);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [reservationUrl, setReservationUrl] = useState(initial.reservationUrl ?? "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function changeProvider(value: string) {
    setProvider(value as ReservationProvider);
    setStatus("");
  }

  async function save() {
    if (saving) return;
    const cleanUrl = reservationUrl.trim();
    if (enabled && provider === "NONE") {
      setStatus("Choose a reservation provider first.");
      return;
    }
    if (provider !== "NONE" && provider !== "FINDEAT" && cleanUrl) {
      try {
        const parsed = new URL(cleanUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        setStatus("Enter a complete HTTP or HTTPS reservation link.");
        return;
      }
    }
    if (enabled && provider !== "FINDEAT" && !cleanUrl) {
      setStatus("Add the reservation link before enabling booking.");
      return;
    }

    setSaving(true);
    setStatus("Saving…");
    try {
      await request(`/restaurants/${restaurant.id}/reservation-config`, {
        method: "PATCH",
        body: JSON.stringify({
          provider,
          enabled,
          reservationUrl:
            provider === "NONE" || provider === "FINDEAT"
              ? null
              : cleanUrl || null,
        }),
      });
      await onSaved();
      setStatus("Reservation settings saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save reservation settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 overflow-visible rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_12px_34px_rgba(24,18,12,0.06)] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <CalendarCheckIcon size={23} weight="fill" />
          </span>
          <div>
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--accent)]">Reservations</p>
            <h3 className="m-0 mt-1 text-xl font-black text-[var(--ink)]">Online booking</h3>
            <p className="m-0 mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Add your existing booking page so guests can open it directly from your FindEat profile.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => {
          setEnabled((current) => !current);
          setStatus("");
        }}
        className="mt-6 flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 text-left transition hover:border-[var(--muted)]"
      >
        <span className="min-w-0">
          <span className="block text-sm font-black text-[var(--ink)]">Show a Book a Table button</span>
          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
            {enabled
              ? "Guests can open your booking page from the restaurant profile."
              : "Turn this on to let guests book from your restaurant profile."}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`text-xs font-extrabold ${enabled ? "text-emerald-600 dark:text-emerald-300" : "text-[var(--muted)]"}`}>
            {enabled ? "On" : "Off"}
          </span>
          <span
            aria-hidden="true"
            className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
          </span>
        </span>
      </button>

      {enabled ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {provider !== "FINDEAT" ? <label className="grid min-w-0 gap-2 text-sm font-extrabold text-[var(--ink)]">
            Booking service
            <CustomDropdown
              value={provider}
              options={providerOptions}
              onChange={changeProvider}
              ariaLabel="Booking service"
            />
          </label> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Native booking is configured from the Business Pro Reservations workspace, where you can also add tables and manage bookings.</div>}
          <label className="grid min-w-0 gap-2 text-sm font-extrabold text-[var(--ink)]">
            Your booking page link
            <input
              type="url"
              inputMode="url"
              placeholder="https://booking-service.com/your-restaurant"
              value={reservationUrl}
              onChange={(event) => {
                setReservationUrl(event.target.value);
                setStatus("");
              }}
              className="h-12 min-w-0 rounded-xl border border-[#dcdad5] bg-[var(--surface)] px-3.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--ink)] focus:shadow-[0_0_0_3px_#17171710] dark:border-[var(--line)]"
            />
          </label>
          <p className="m-0 text-xs leading-5 text-[var(--muted)] md:col-span-2">
            Copy the public booking link from Ontopo, Tabit, or your other booking service. FindEat will open that page when a guest taps Book a Table.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-[var(--soft)] px-4 py-3 text-sm text-[var(--muted)]">
          Online booking is hidden from guests. Your saved link will remain here if you turn it back on.
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className={`text-sm ${status === "Reservation settings saved" ? "font-bold text-emerald-600" : "text-[var(--muted)]"}`}>
            {status}
          </span>
          {!status && enabled ? (
            <p className="m-0 text-xs text-[var(--muted)]">Save when you are ready to make the button available.</p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="min-h-11 rounded-xl bg-[var(--ink)] px-5 text-sm font-extrabold text-[var(--surface)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-55"
        >
          {saving ? "Saving…" : "Save booking settings"}
        </button>
      </div>
    </section>
  );
}
