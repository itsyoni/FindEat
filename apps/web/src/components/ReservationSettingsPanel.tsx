import { useMemo, useState } from "react";
import { ArrowSquareOutIcon, CalendarCheckIcon } from "@phosphor-icons/react";
import type {
  ManagedRestaurant,
  ReservationProvider,
  RestaurantReservationConfig,
} from "@findeat/types";
import { request } from "../lib/api";
import { CustomDropdown } from "./CustomDropdown";

const providerOptions = [
  { value: "NONE", label: "No provider" },
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
  };
}

function providerName(provider: ReservationProvider) {
  return providerOptions.find((option) => option.value === provider)?.label ?? "Provider";
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
  const [providerReference, setProviderReference] = useState(
    typeof initial.providerMetadata?.reference === "string"
      ? initial.providerMetadata.reference
      : "",
  );
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const previewEnabled = enabled && provider !== "NONE" && Boolean(reservationUrl.trim());

  function changeProvider(value: string) {
    const nextProvider = value as ReservationProvider;
    setProvider(nextProvider);
    if (nextProvider === "NONE") setEnabled(false);
  }

  async function save() {
    if (saving) return;
    const cleanUrl = reservationUrl.trim();
    if (enabled && provider === "NONE") {
      setStatus("Choose a reservation provider first.");
      return;
    }
    if (provider !== "NONE" && cleanUrl) {
      try {
        const parsed = new URL(cleanUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        setStatus("Enter a complete HTTP or HTTPS reservation link.");
        return;
      }
    }
    if (enabled && !cleanUrl) {
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
          reservationUrl: provider === "NONE" ? null : cleanUrl || null,
          providerMetadata: providerReference.trim()
            ? { reference: providerReference.trim() }
            : null,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <CalendarCheckIcon size={23} weight="fill" />
          </span>
          <div>
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--accent)]">Reservations</p>
            <h3 className="m-0 mt-1 text-xl font-black text-[var(--ink)]">Booking link</h3>
            <p className="m-0 mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              FindEat sends guests to your booking provider. Availability, confirmation, and changes stay with that provider.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={provider === "NONE"}
          onClick={() => setEnabled((current) => !current)}
          className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ${
            enabled
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
              : "border-[var(--line)] bg-[var(--soft)] text-[var(--muted)]"
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-gray-400"}`} />
          {enabled ? "Booking enabled" : "Booking disabled"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-extrabold text-[var(--ink)]">
          Provider
          <CustomDropdown
            value={provider}
            options={providerOptions}
            onChange={changeProvider}
            ariaLabel="Reservation provider"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-extrabold text-[var(--ink)]">
          Reservation link
          <input
            type="url"
            inputMode="url"
            disabled={provider === "NONE"}
            placeholder="https://booking-provider.com/your-restaurant"
            value={reservationUrl}
            onChange={(event) => setReservationUrl(event.target.value)}
            className="h-12 min-w-0 rounded-xl border border-[#dcdad5] bg-[var(--surface)] px-3.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--ink)] focus:shadow-[0_0_0_3px_#17171710] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[var(--line)]"
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-extrabold text-[var(--ink)] md:col-span-2">
          Provider reference <span className="font-medium text-[var(--muted)]">(optional)</span>
          <input
            disabled={provider === "NONE"}
            placeholder="Location or account reference supplied by your provider"
            value={providerReference}
            onChange={(event) => setProviderReference(event.target.value)}
            className="h-12 min-w-0 rounded-xl border border-[#dcdad5] bg-[var(--surface)] px-3.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--ink)] focus:shadow-[0_0_0_3px_#17171710] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[var(--line)]"
          />
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--soft)] p-4">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">Guest preview</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="m-0 font-black text-[var(--ink)]">Book a Table</p>
            <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
              {provider === "NONE" ? "Choose a provider to preview the button" : `Booking via ${providerName(provider)}`}
            </p>
          </div>
          <button
            type="button"
            disabled={!previewEnabled}
            onClick={() => window.open(reservationUrl.trim(), "_blank", "noopener,noreferrer")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-extrabold text-[var(--surface)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Preview booking
            <ArrowSquareOutIcon size={17} weight="bold" />
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className={`text-sm ${status === "Reservation settings saved" ? "font-bold text-emerald-600" : "text-[var(--muted)]"}`}>
          {status}
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="min-h-11 rounded-xl bg-[var(--ink)] px-5 text-sm font-extrabold text-[var(--surface)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-55"
        >
          {saving ? "Saving…" : "Save reservation settings"}
        </button>
      </div>
    </section>
  );
}
