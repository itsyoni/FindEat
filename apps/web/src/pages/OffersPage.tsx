import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { GiftIcon } from "@phosphor-icons/react/dist/csr/Gift";
import { PauseIcon } from "@phosphor-icons/react/dist/csr/Pause";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TicketIcon } from "@phosphor-icons/react/dist/csr/Ticket";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type {
  ManagedRestaurant,
  RestaurantOffer,
  RestaurantOfferAnalytics,
  RestaurantOfferAudienceType,
  RestaurantOfferType,
} from "@findeat/types";
import { request } from "../lib/api";

const audienceOptions: Array<{ value: RestaurantOfferAudienceType; label: string; hint: string }> = [
  { value: "FOLLOWERS", label: "Followers", hint: "People following your restaurant" },
  { value: "WANT_TO_TRY", label: "Want to try", hint: "People who saved your place for later" },
  { value: "VISITED", label: "Visited", hint: "People who marked a visit" },
  { value: "FAVORITED", label: "Favorited", hint: "Your most engaged guests" },
];

const typeOptions: Array<{ value: RestaurantOfferType; label: string }> = [
  { value: "PERCENTAGE_DISCOUNT", label: "% off" },
  { value: "FIXED_DISCOUNT", label: "Fixed discount" },
  { value: "FREE_ITEM", label: "Free item" },
  { value: "CUSTOM_BENEFIT", label: "Custom benefit" },
];

type OfferForm = {
  title: string;
  description: string;
  type: RestaurantOfferType;
  discountValue: string;
  estimatedSavings: string;
  minimumSpend: string;
  maximumDiscount: string;
  currency: string;
  validFrom: string;
  validUntil: string;
  maxClaims: string;
  terms: string;
  audiences: RestaurantOfferAudienceType[];
};

function localDateTime(date = new Date(Date.now() + 60 * 60 * 1000)) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function emptyForm(): OfferForm {
  return {
    title: "",
    description: "",
    type: "PERCENTAGE_DISCOUNT",
    discountValue: "",
    estimatedSavings: "",
    minimumSpend: "",
    maximumDiscount: "",
    currency: "ILS",
    validFrom: localDateTime(),
    validUntil: localDateTime(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
    maxClaims: "",
    terms: "",
    audiences: ["FOLLOWERS"],
  };
}

function benefitLabel(offer: RestaurantOffer) {
  if (offer.type === "PERCENTAGE_DISCOUNT") return `${Number(offer.discountValue)}% off`;
  if (offer.type === "FIXED_DISCOUNT") return `${Number(offer.discountValue)} ${offer.currency} off`;
  if (offer.type === "FREE_ITEM") return "Free item";
  return offer.description || "Custom reward";
}

function inputClass() {
  return "min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10";
}

export function OffersPage({ restaurant }: { restaurant: ManagedRestaurant }) {
  const [offers, setOffers] = useState<RestaurantOffer[]>([]);
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [redeemToken, setRedeemToken] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [redeemMessage, setRedeemMessage] = useState("");
  const [analytics, setAnalytics] = useState<Record<string, RestaurantOfferAnalytics>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOffers(await request<RestaurantOffer[]>(`/restaurants/${restaurant.id}/offers`, { cache: "reload" }));
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load offers");
    } finally {
      setLoading(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    // Initial loading belongs to this route's mount lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const totals = useMemo(() => ({
    active: offers.filter((offer) => offer.status === "ACTIVE").length,
    claims: offers.reduce((sum, offer) => sum + offer.claimCount, 0),
    redemptions: offers.reduce((sum, offer) => sum + offer.redemptionCount, 0),
  }), [offers]);
  const editingOffer = editingId ? offers.find((offer) => offer.id === editingId) : undefined;
  const materialLocked = (editingOffer?.claimCount ?? 0) > 0;

  function editOffer(offer: RestaurantOffer) {
    setEditingId(offer.id);
    setForm({
      title: offer.title,
      description: offer.description ?? "",
      type: offer.type,
      discountValue: offer.discountValue?.toString() ?? "",
      estimatedSavings: offer.estimatedSavings?.toString() ?? "",
      minimumSpend: offer.minimumSpend?.toString() ?? "",
      maximumDiscount: offer.maximumDiscount?.toString() ?? "",
      currency: offer.currency,
      validFrom: localDateTime(new Date(offer.validFrom)),
      validUntil: localDateTime(new Date(offer.validUntil)),
      maxClaims: offer.maxClaims?.toString() ?? "",
      terms: offer.terms ?? "",
      audiences: offer.audiences.map((audience) => audience.type),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  }

  async function saveOffer(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const fullPayload = {
        ...form,
        discountValue: form.discountValue ? Number(form.discountValue) : undefined,
        estimatedSavings: form.estimatedSavings ? Number(form.estimatedSavings) : undefined,
        minimumSpend: form.minimumSpend ? Number(form.minimumSpend) : undefined,
        maximumDiscount: form.maximumDiscount ? Number(form.maximumDiscount) : undefined,
        maxClaims: form.maxClaims ? Number(form.maxClaims) : undefined,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
      };
      const payload = materialLocked
        ? { title: form.title, description: form.description }
        : fullPayload;
      await request(
        editingId
          ? `/restaurants/${restaurant.id}/offers/${editingId}`
          : `/restaurants/${restaurant.id}/offers`,
        { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      closeForm();
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save offer");
    } finally {
      setSaving(false);
    }
  }

  async function offerAction(offerId: string, action: "publish" | "pause" | "cancel") {
    try {
      await request(`/restaurants/${restaurant.id}/offers/${offerId}/${action}`, { method: "POST" });
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update offer");
    }
  }

  async function toggleAnalytics(offerId: string) {
    if (analytics[offerId]) {
      setAnalytics((current) => {
        const next = { ...current };
        delete next[offerId];
        return next;
      });
      return;
    }
    const result = await request<RestaurantOfferAnalytics>(
      `/restaurants/${restaurant.id}/offers/${offerId}/analytics`,
      { cache: "reload" },
    );
    setAnalytics((current) => ({ ...current, [offerId]: result }));
  }

  async function redeem(event: React.FormEvent) {
    event.preventDefault();
    try {
      const result = await request<{ actualSavingsAmount?: number | string | null }>(
        `/restaurants/${restaurant.id}/rewards/redeem`,
        {
          method: "POST",
          body: JSON.stringify({
            token: redeemToken.trim(),
            purchaseAmount: purchaseAmount ? Number(purchaseAmount) : undefined,
          }),
        },
      );
      setRedeemMessage(`Reward redeemed${result.actualSavingsAmount ? ` · ${result.actualSavingsAmount} saved` : ""}`);
      setRedeemToken("");
      setPurchaseAmount("");
      await load();
    } catch (nextError) {
      setRedeemMessage(nextError instanceof Error ? nextError.message : "Could not redeem reward");
    }
  }

  return (
    <div className="page-stack mx-auto grid w-full max-w-6xl gap-5 px-5 py-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-accent">Rewards</p>
          <h1 className="m-0 text-3xl font-black tracking-tight text-ink">Offers and coupons</h1>
          <p className="mb-0 mt-2 text-sm text-muted">Reward the right guests without sending blanket promotions.</p>
        </div>
        <button className="flex min-h-11 items-center gap-2 rounded-xl border-0 bg-accent px-4 font-black text-white shadow-sm transition hover:-translate-y-0.5" onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true); }}>
          <PlusIcon size={18} weight="bold" /> New offer
        </button>
      </section>

      <section className="grid grid-cols-3 gap-3 max-[700px]:grid-cols-1">
        {[["Active offers", totals.active], ["Claims", totals.claims], ["Redeemed", totals.redemptions]].map(([label, value]) => (
          <div className="rounded-2xl border border-line bg-surface p-4" key={label}>
            <strong className="block text-2xl font-black text-ink">{value}</strong>
            <span className="text-xs font-bold text-muted">{label}</span>
          </div>
        ))}
      </section>

      <form className="grid gap-3 rounded-2xl border border-line bg-surface p-5" onSubmit={redeem}>
        <div className="flex items-center gap-3"><TicketIcon size={24} weight="duotone" className="text-accent" /><div><strong className="block text-sm text-ink">Redeem a guest reward</strong><small className="text-muted">Enter the short-lived code shown on their phone.</small></div></div>
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_auto] gap-2 max-[650px]:grid-cols-1">
          <input className={inputClass()} value={redeemToken} onChange={(event) => setRedeemToken(event.target.value)} placeholder="Redemption code" required />
          <input className={inputClass()} value={purchaseAmount} onChange={(event) => setPurchaseAmount(event.target.value)} type="number" min="0" step="0.01" placeholder="Bill amount (if needed)" />
          <button className="min-h-11 rounded-xl border-0 bg-ink px-5 font-black text-surface" type="submit">Redeem</button>
        </div>
        {redeemMessage ? <p className="m-0 text-sm font-bold text-muted">{redeemMessage}</p> : null}
      </form>

      {error ? <div className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">{error}</div> : null}
      {loading ? <div className="py-16 text-center text-muted">Loading offers…</div> : null}
      {!loading && offers.length === 0 ? (
        <section className="grid place-items-center rounded-3xl border border-dashed border-line bg-surface px-6 py-16 text-center">
          <GiftIcon size={48} weight="duotone" className="mb-3 text-accent" />
          <h2 className="m-0 text-xl font-black text-ink">Create your first useful reward</h2>
          <p className="max-w-md text-sm text-muted">Choose followers, future visitors, previous guests, or favorites. Overlapping groups are automatically deduplicated.</p>
        </section>
      ) : null}

      <section className="grid gap-3">
        {offers.map((offer) => {
          const stats = analytics[offer.id];
          return (
            <article className="rounded-2xl border border-line bg-surface p-5" key={offer.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-black uppercase text-accent">{offer.status}</span>
                    <span className="text-xs font-black text-ink">{benefitLabel(offer)}</span>
                  </div>
                  <h2 className="m-0 text-lg font-black text-ink">{offer.title}</h2>
                  <p className="mb-0 mt-1 text-sm text-muted">{offer.description || "No description"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg border border-line bg-surface-subtle px-3 py-2 text-xs font-black text-ink" onClick={() => editOffer(offer)}>Edit</button>
                  {offer.status === "ACTIVE" ? <button className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface-subtle text-ink" aria-label="Pause offer" onClick={() => void offerAction(offer.id, "pause")}><PauseIcon size={16} weight="fill" /></button> : null}
                  {offer.status === "DRAFT" || offer.status === "PAUSED" ? <button className="grid h-9 w-9 place-items-center rounded-lg border-0 bg-success-soft text-success" aria-label="Publish offer" onClick={() => void offerAction(offer.id, "publish")}><PlayIcon size={16} weight="fill" /></button> : null}
                  {!['ENDED', 'CANCELLED'].includes(offer.status) ? <button className="grid h-9 w-9 place-items-center rounded-lg border-0 bg-danger-soft text-danger" aria-label="End offer" onClick={() => void offerAction(offer.id, "cancel")}><XIcon size={16} weight="bold" /></button> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {offer.audiences.map((audience) => <span className="rounded-full bg-neutral-chip px-2.5 py-1 text-[10px] font-black text-neutral-chip-text" key={audience.type}>{audienceOptions.find((item) => item.value === audience.type)?.label ?? audience.type}</span>)}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-4 max-[700px]:grid-cols-2">
                <div><strong className="block text-sm text-ink">{offer.eligibleUsers ?? 0}</strong><small className="text-muted">Eligible</small></div>
                <div><strong className="block text-sm text-ink">{offer.claimCount}</strong><small className="text-muted">Claims</small></div>
                <div><strong className="block text-sm text-ink">{offer.redemptionCount}</strong><small className="text-muted">Redeemed</small></div>
                <div><strong className="block text-sm text-ink">{new Date(offer.validUntil).toLocaleDateString()}</strong><small className="text-muted">Ends</small></div>
              </div>
              <button className="mt-3 border-0 bg-transparent p-0 text-xs font-black text-accent" onClick={() => void toggleAnalytics(offer.id)}>{stats ? "Hide analytics" : "View analytics"}</button>
              {stats ? <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-surface-subtle p-3 text-xs max-[700px]:grid-cols-2"><span><b>{stats.views}</b> views</span><span><b>{Math.round(stats.claimRate * 100)}%</b> claimed</span><span><b>{Math.round(stats.redemptionRate * 100)}%</b> redeemed</span><span><b>{Number(stats.actualSavingsAmount).toFixed(2)}</b> saved</span></div> : null}
            </article>
          );
        })}
      </section>

      {showForm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#17131199] p-4 max-[600px]:items-end max-[600px]:p-0" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <form className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-6 shadow-2xl max-[600px]:max-h-[calc(100dvh_-_12px)] max-[600px]:rounded-b-none max-[600px]:px-4 max-[600px]:pt-5 max-[600px]:pb-[calc(16px_+_env(safe-area-inset-bottom))]" onSubmit={saveOffer}>
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="m-0 text-xs font-black uppercase tracking-widest text-accent">Offer builder</p><h2 className="mb-0 mt-1 text-2xl font-black text-ink">{editingId ? "Edit offer" : "New reward"}</h2></div><button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface-subtle text-ink" onClick={closeForm}><XIcon size={17} weight="bold" /></button></div>
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-xs font-black text-ink">Title<input className={inputClass()} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
              <label className="grid gap-1.5 text-xs font-black text-ink">Description<textarea className={`${inputClass()} min-h-20 resize-y py-3`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <fieldset disabled={materialLocked} className="contents disabled:opacity-55">
              <fieldset className="grid gap-2 border-0 p-0"><legend className="mb-2 text-xs font-black text-ink">Benefit type</legend><div className="grid grid-cols-4 gap-2 max-[650px]:grid-cols-2">{typeOptions.map((option) => <button type="button" key={option.value} className={`min-h-11 rounded-xl border px-2 text-xs font-black ${form.type === option.value ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-subtle text-ink"}`} onClick={() => setForm({ ...form, type: option.value })}>{option.label}</button>)}</div></fieldset>
              <div className="grid grid-cols-2 gap-3 max-[650px]:grid-cols-1">
                {(form.type === "PERCENTAGE_DISCOUNT" || form.type === "FIXED_DISCOUNT") ? <label className="grid gap-1.5 text-xs font-black text-ink">Discount value<input className={inputClass()} type="number" min="0" step="0.01" max={form.type === "PERCENTAGE_DISCOUNT" ? 100 : undefined} value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} required /></label> : <label className="grid gap-1.5 text-xs font-black text-ink">Estimated savings (optional)<input className={inputClass()} type="number" min="0" step="0.01" value={form.estimatedSavings} onChange={(event) => setForm({ ...form, estimatedSavings: event.target.value })} /></label>}
                <label className="grid gap-1.5 text-xs font-black text-ink">Currency<input className={inputClass()} maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></label>
                <label className="grid gap-1.5 text-xs font-black text-ink">Minimum spend<input className={inputClass()} type="number" min="0" step="0.01" value={form.minimumSpend} onChange={(event) => setForm({ ...form, minimumSpend: event.target.value })} /></label>
                {form.type === "PERCENTAGE_DISCOUNT" ? <label className="grid gap-1.5 text-xs font-black text-ink">Maximum discount<input className={inputClass()} type="number" min="0" step="0.01" value={form.maximumDiscount} onChange={(event) => setForm({ ...form, maximumDiscount: event.target.value })} /></label> : null}
                <label className="grid gap-1.5 text-xs font-black text-ink">Starts<input className={inputClass()} type="datetime-local" value={form.validFrom} onChange={(event) => setForm({ ...form, validFrom: event.target.value })} required /></label>
                <label className="grid gap-1.5 text-xs font-black text-ink">Ends<input className={inputClass()} type="datetime-local" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} required /></label>
                <label className="grid gap-1.5 text-xs font-black text-ink">Claim limit (optional)<input className={inputClass()} type="number" min="1" value={form.maxClaims} onChange={(event) => setForm({ ...form, maxClaims: event.target.value })} /></label>
              </div>
              <fieldset className="grid gap-2 border-0 p-0"><legend className="mb-1 text-xs font-black text-ink">Who can claim? <span className="font-medium text-muted">Groups combine with OR.</span></legend>{audienceOptions.map((option) => { const selected = form.audiences.includes(option.value); return <button type="button" key={option.value} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${selected ? "border-accent bg-accent-soft" : "border-line bg-surface-subtle"}`} onClick={() => setForm({ ...form, audiences: selected ? form.audiences.filter((item) => item !== option.value) : [...form.audiences, option.value] })}><span className={`grid h-6 w-6 place-items-center rounded-full ${selected ? "bg-accent text-white" : "border border-line text-transparent"}`}><CheckCircleIcon size={15} weight="fill" /></span><span><strong className="block text-xs text-ink">{option.label}</strong><small className="text-muted">{option.hint}</small></span></button>; })}</fieldset>
              <label className="grid gap-1.5 text-xs font-black text-ink">Terms<textarea className={`${inputClass()} min-h-24 resize-y py-3`} value={form.terms} onChange={(event) => setForm({ ...form, terms: event.target.value })} /></label>
              </fieldset>
              {materialLocked ? <p className="m-0 rounded-xl bg-warning-soft p-3 text-xs font-bold text-warning">Benefit, audience, dates and terms are locked after the first claim. End the offer and create a new one to change them.</p> : null}
              <button className="min-h-12 rounded-xl border-0 bg-accent px-5 font-black text-white disabled:opacity-50" disabled={saving || form.audiences.length === 0}>{saving ? "Saving…" : editingId ? "Save changes" : "Create draft"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
