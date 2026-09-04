import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { NotePencilIcon } from "@phosphor-icons/react/dist/csr/NotePencil";
import { ShieldWarningIcon } from "@phosphor-icons/react/dist/csr/ShieldWarning";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type {
  AdminDirectoryDetail,
  AdminDirectoryReport,
  AdminDirectorySearchRestaurant,
  AdminDirectorySearchResult,
  AdminDirectorySearchUser,
} from "@findeat/types";
import { request } from "../lib/api";
import { confirmAction } from "../lib/appConfirm";

type SearchType = "ALL" | "USER" | "RESTAURANT";
type DetailTab = "overview" | "reports" | "moderation" | "edit";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function label(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function Avatar({ src, name }: { src?: string | null; name: string }) {
  return src ? (
    <img className="size-12 shrink-0 rounded-2xl object-cover" src={src} alt="" />
  ) : (
    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-lg font-black text-accent">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function ReportList({ reports, empty }: { reports: AdminDirectoryReport[]; empty: string }) {
  if (!reports.length) {
    return <p className="rounded-2xl bg-surface-subtle p-5 text-center text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="grid gap-2.5">
      {reports.map((report) => (
        <article key={report.id} className="rounded-2xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">{label(report.reason)}</strong>
            <span className="rounded-full bg-soft px-2.5 py-1 text-[10px] font-extrabold text-muted">
              {label(report.targetType)}
            </span>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-extrabold text-accent">
              {label(report.status)}
            </span>
            <time className="ml-auto text-[10px] text-muted">{formatDate(report.createdAt)}</time>
          </div>
          {report.details ? <p className="mb-0 mt-2 text-xs leading-5 text-muted">{report.details}</p> : null}
          {report.resolutionNote ? (
            <p className="mb-0 mt-2 rounded-xl bg-surface p-3 text-xs"><b>Resolution:</b> {report.resolutionNote}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function AdminDirectoryPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("ALL");
  const [results, setResults] = useState<AdminDirectorySearchResult>({ users: [], restaurants: [] });
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<AdminDirectoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<Record<string, string | boolean>>({});
  const [requestField, setRequestField] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const totalResults = results.users.length + results.restaurants.length;
  const analytics = useMemo(
    () => (detail ? Object.entries(detail.analytics) : []),
    [detail],
  );

  async function search(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters.");
      return;
    }
    setSearching(true);
    setSearched(true);
    setError("");
    try {
      setResults(
        await request<AdminDirectorySearchResult>(
          `/admin/directory/search?q=${encodeURIComponent(trimmed)}&type=${type}`,
          { cache: "reload" },
        ),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not search the directory");
    } finally {
      setSearching(false);
    }
  }

  async function openDetail(kind: "USER" | "RESTAURANT", id: string) {
    setDetailLoading(true);
    setDetail(null);
    setTab("overview");
    setError("");
    setRequestField("");
    setRequestMessage("");
    setRequestSent(false);
    try {
      const endpoint = kind === "USER" ? `users/${id}` : `restaurants/${id}`;
      const next = await request<AdminDirectoryDetail>(`/admin/directory/${endpoint}`, { cache: "reload" });
      setDetail(next);
      if (next.kind === "USER") {
        setEdit({
          displayName: next.profile.displayName,
          username: next.profile.username,
          bio: next.profile.bio ?? "",
          phoneNumber: next.profile.phoneNumber ?? "",
          pronouns: next.profile.pronouns ?? "",
          isPrivate: next.profile.isPrivate,
        });
      } else {
        setEdit({
          name: next.profile.name,
          bio: next.profile.bio ?? "",
          address: next.profile.address ?? "",
          city: next.profile.city ?? "",
          countryCode: next.profile.countryCode ?? "",
          phone: next.profile.phone ?? "",
          website: next.profile.website ?? "",
          instagram: next.profile.instagram ?? "",
          status: next.profile.status,
        });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load this account");
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError("");
    try {
      const endpoint = detail.kind === "USER" ? `users/${detail.profile.id}` : `restaurants/${detail.profile.id}`;
      await request(`/admin/directory/${endpoint}`, {
        method: "PATCH",
        body: JSON.stringify(edit),
      });
      await openDetail(detail.kind, detail.profile.id);
      setTab("edit");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function sendChangeRequest(event: FormEvent) {
    event.preventDefault();
    if (!detail || requestMessage.trim().length < 4) return;
    setSaving(true);
    setError("");
    try {
      await request("/admin/directory/change-requests", {
        method: "POST",
        body: JSON.stringify({
          targetType: detail.kind,
          targetId: detail.profile.id,
          field: requestField.trim() || undefined,
          message: requestMessage.trim(),
        }),
      });
      setRequestMessage("");
      setRequestField("");
      setRequestSent(true);
      await openDetail(detail.kind, detail.profile.id);
      setTab("edit");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create the request");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspension() {
    if (!detail || detail.kind !== "USER") return;
    const suspended = !detail.profile.isSuspended;
    const confirmed = await confirmAction({
      title: suspended ? "Suspend this account?" : "Restore this account?",
      message: suspended
        ? "The user will lose access. This is a manual enforcement action and will be recorded."
        : "The active suspension will be revoked and the restoration will be recorded.",
      confirmLabel: suspended ? "Suspend account" : "Restore account",
      tone: suspended ? "destructive" : "default",
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await request(`/admin/moderation/users/${detail.profile.id}`, {
        method: "PATCH",
        body: JSON.stringify({ suspended }),
      });
      await openDetail("USER", detail.profile.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update the suspension");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <header className="mb-7 flex items-end justify-between gap-5 max-[700px]:items-start max-[700px]:flex-col">
        <div>
          <p className="mb-2 text-xs font-extrabold tracking-[.13em] text-accent">ACCOUNT DIRECTORY</p>
          <h2 className="m-0 text-[clamp(30px,4vw,40px)] tracking-[-.04em]">Users & restaurants</h2>
          <p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-muted">
            Review profiles, account history, reports, moderation decisions, and useful activity signals in one place.
          </p>
        </div>
        {searched ? <span className="rounded-full bg-soft px-3 py-2 text-xs font-extrabold text-muted">{totalResults} results</span> : null}
      </header>

      <form className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm max-[650px]:grid-cols-1" onSubmit={search}>
        <div className="flex gap-1 rounded-xl bg-surface-subtle p-1">
          {(["ALL", "USER", "RESTAURANT"] as SearchType[]).map((option) => (
            <button key={option} type="button" className={`rounded-lg border-0 px-3 py-2 text-[11px] font-extrabold ${type === option ? "bg-ink text-white" : "bg-transparent text-muted"}`} onClick={() => setType(option)}>
              {option === "ALL" ? "All" : option === "USER" ? "Users" : "Places"}
            </button>
          ))}
        </div>
        <label className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-subtle px-3">
          <MagnifyingGlassIcon size={19} className="shrink-0 text-muted" />
          <input className="h-11 min-w-0 flex-1 border-0 bg-transparent p-0 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, username, email, city or place ID…" />
        </label>
        <button className="rounded-xl border-0 bg-accent px-5 font-extrabold text-white disabled:opacity-50" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
      </form>
      {error && !detail ? <p className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p> : null}

      {searched && !searching && totalResults === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-line p-14 text-center text-muted">No matching users or restaurants.</div>
      ) : null}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {results.users.map((user: AdminDirectorySearchUser) => (
          <button key={user.id} type="button" onClick={() => void openDetail("USER", user.id)} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:bg-surface-hover">
            <Avatar src={user.avatarUrl} name={user.displayName} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold">{user.displayName}</span>
              <span className="mt-1 block truncate text-xs text-muted">@{user.username} · {user.email}</span>
              <span className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-muted">
                <i className="not-italic">{user._count.reportsReceived} reports received</i>
                <i className="not-italic">· {user._count.reportsSubmitted} sent</i>
              </span>
            </span>
            {user.isSuspended ? <span className="rounded-full bg-danger-soft px-2 py-1 text-[9px] font-black text-danger">SUSPENDED</span> : null}
          </button>
        ))}
        {results.restaurants.map((restaurant: AdminDirectorySearchRestaurant) => (
          <button key={restaurant.id} type="button" onClick={() => void openDetail("RESTAURANT", restaurant.id)} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:bg-surface-hover">
            <Avatar src={restaurant.logoUrl} name={restaurant.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold">{restaurant.name}</span>
              <span className="mt-1 block truncate text-xs text-muted">{[restaurant.address, restaurant.city, restaurant.countryCode].filter(Boolean).join(", ") || "No address"}</span>
              <span className="mt-2 block text-[10px] font-bold text-muted">{restaurant._count.followers} followers · {restaurant._count.members} team members · {restaurant._count.reports} reports</span>
            </span>
            <span className="rounded-full bg-success-soft px-2 py-1 text-[9px] font-black text-success">{restaurant.status}</span>
          </button>
        ))}
      </div>

      {(detailLoading || detail) ? (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-[#111b] p-5 backdrop-blur-xl max-[700px]:p-0" role="dialog" aria-modal="true">
          <section className="grid h-[min(880px,94dvh)] w-[min(1100px,96vw)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-[28px] border border-line bg-surface shadow-2xl max-[700px]:h-dvh max-[700px]:w-full max-[700px]:rounded-none max-[700px]:border-0">
            {detailLoading || !detail ? (
              <div className="grid h-full min-h-[400px] place-items-center text-sm text-muted">Loading account history…</div>
            ) : (
              <>
                <header className="flex items-center gap-4 border-b border-line p-5 max-[600px]:p-4">
                  <Avatar src={detail.kind === "USER" ? detail.profile.avatarUrl : detail.profile.logoUrl} name={detail.kind === "USER" ? detail.profile.displayName : detail.profile.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 truncate text-xl">{detail.kind === "USER" ? detail.profile.displayName : detail.profile.name}</h3>
                      <span className="rounded-full bg-soft px-2 py-1 text-[9px] font-black text-muted">{detail.kind}</span>
                    </div>
                    <p className="mb-0 mt-1 truncate text-xs text-muted">{detail.kind === "USER" ? `@${detail.profile.username} · ${detail.profile.email}` : [detail.profile.address, detail.profile.city].filter(Boolean).join(", ") || "No address"}</p>
                  </div>
                  <button className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-subtle" type="button" aria-label="Close" onClick={() => setDetail(null)}><XIcon size={19} /></button>
                </header>
                <nav className="flex gap-1 overflow-x-auto border-b border-line px-5 py-2 max-[600px]:px-3">
                  {(["overview", "reports", ...(detail.kind === "USER" ? ["moderation"] : []), "edit"] as DetailTab[]).map((item) => (
                    <button key={item} className={`whitespace-nowrap rounded-xl border-0 px-4 py-2 text-xs font-extrabold ${tab === item ? "bg-ink text-white" : "bg-transparent text-muted"}`} onClick={() => setTab(item)}>{label(item)}</button>
                  ))}
                </nav>
                <div className="min-h-0 overflow-y-auto p-5 max-[600px]:p-4">
                  {error ? <p className="mt-0 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p> : null}
                  {tab === "overview" ? (
                    <div className="grid gap-4">
                      {detail.kind === "USER" ? (
                        <section className="grid grid-cols-[1.3fr_.7fr] gap-3 max-[720px]:grid-cols-1">
                          <article className="rounded-2xl border border-line p-4">
                            <p className="m-0 text-[10px] font-black tracking-widest text-muted">ACCOUNT STATUS</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${detail.profile.isSuspended ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>{detail.profile.isSuspended ? "Suspended" : "Active"}</span>
                              <span className="rounded-full bg-soft px-3 py-1 text-xs font-extrabold text-muted">{detail.profile.emailVerifiedAt ? "Email verified" : "Email unverified"}</span>
                              <span className="rounded-full bg-soft px-3 py-1 text-xs font-extrabold text-muted">{detail.profile.isPrivate ? "Private" : "Public"}</span>
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs max-[500px]:grid-cols-1">
                              <div><dt className="text-muted">Joined</dt><dd className="m-0 mt-1 font-bold">{formatDate(detail.profile.createdAt)}</dd></div>
                              <div><dt className="text-muted">Last seen</dt><dd className="m-0 mt-1 font-bold">{formatDate(detail.profile.lastSeenAt)}</dd></div>
                              <div><dt className="text-muted">Sign-in methods</dt><dd className="m-0 mt-1 font-bold">{[detail.profile.authIdentities.map((identity) => label(identity.provider)), "Password"].flat().join(", ")}</dd></div>
                              <div><dt className="text-muted">Onboarding</dt><dd className="m-0 mt-1 font-bold">{detail.profile.onboardingCompletedAt ? "Completed" : "Incomplete"}</dd></div>
                            </dl>
                          </article>
                          <article className="rounded-2xl border border-line p-4">
                            <p className="m-0 text-[10px] font-black tracking-widest text-muted">ACTIVE STRIKES</p>
                            <strong className="mt-2 block text-5xl tracking-[-.06em]">{detail.strikes.active}</strong>
                            <p className="mb-0 mt-2 text-xs leading-5 text-muted">{detail.strikes.lifetime} lifetime removals · {detail.strikes.reversed} reversed. Suspension is manual; there is no automatic threshold.</p>
                          </article>
                        </section>
                      ) : null}
                      <section>
                        <p className="mb-2 text-[10px] font-black tracking-widest text-muted">ACTIVITY</p>
                        <div className="grid grid-cols-4 gap-2 max-[850px]:grid-cols-3 max-[560px]:grid-cols-2">
                          {analytics.map(([key, value]) => (
                            <div key={key} className="rounded-2xl bg-surface-subtle p-3"><strong className="block text-xl">{value.toLocaleString()}</strong><span className="mt-1 block text-[10px] text-muted">{label(key)}</span></div>
                          ))}
                        </div>
                      </section>
                      {detail.kind === "RESTAURANT" ? (
                        <section>
                          <p className="mb-2 text-[10px] font-black tracking-widest text-muted">TEAM & OWNERSHIP</p>
                          <div className="grid gap-2">
                            {detail.profile.members.map((member) => (
                              <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-surface-subtle p-3"><Avatar src={member.user.avatarUrl} name={member.user.displayName} /><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{member.user.displayName}</strong><span className="block truncate text-xs text-muted">@{member.user.username} · {member.user.email}</span></div><span className="rounded-full bg-soft px-2 py-1 text-[9px] font-black">{member.teamRole?.name ?? label(member.role)}</span></div>
                            ))}
                            {!detail.profile.members.length ? <p className="text-sm text-muted">No team members are attached.</p> : null}
                          </div>
                        </section>
                      ) : null}
                    </div>
                  ) : null}
                  {tab === "reports" ? (
                    <div className="grid grid-cols-2 gap-4 max-[800px]:grid-cols-1">
                      <section><h4 className="mt-0">Reports received <small className="text-muted">({detail.reportsReceived.length})</small></h4><ReportList reports={detail.reportsReceived} empty="No reports received." /></section>
                      <section><h4 className="mt-0">Reports sent <small className="text-muted">({detail.reportsSent.length})</small></h4><ReportList reports={detail.reportsSent} empty="No reports sent." /></section>
                    </div>
                  ) : null}
                  {tab === "moderation" && detail.kind === "USER" ? (
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
                        <div><strong className="block">Manual enforcement</strong><span className="mt-1 block text-xs text-muted">Every suspension and restoration is recorded in the timeline.</span></div>
                        <button type="button" disabled={saving} className={`rounded-xl border-0 px-4 py-3 text-xs font-extrabold ${detail.profile.isSuspended ? "bg-success text-white" : "bg-danger text-white"}`} onClick={() => void toggleSuspension()}>{detail.profile.isSuspended ? "Restore account" : "Suspend account"}</button>
                      </div>
                      {detail.moderationActions.map((action) => (
                        <article key={action.id} className="rounded-2xl bg-surface-subtle p-4">
                          <div className="flex flex-wrap items-center gap-2"><FlagIcon size={17} /><strong className="text-sm">{label(action.action)}</strong>{action.reversedAt ? <span className="rounded-full bg-success-soft px-2 py-1 text-[9px] font-black text-success">REVERSED</span> : null}<time className="ml-auto text-[10px] text-muted">{formatDate(action.createdAt)}</time></div>
                          <p className="mb-0 mt-2 text-xs text-muted">{action.reason} · by @{action.actor.username}</p>
                        </article>
                      ))}
                      {!detail.moderationActions.length ? <p className="rounded-2xl bg-surface-subtle p-5 text-center text-sm text-muted">No moderation history.</p> : null}
                    </div>
                  ) : null}
                  {tab === "edit" ? (
                    <div className="grid grid-cols-[1.1fr_.9fr] gap-4 max-[850px]:grid-cols-1">
                      <form className="rounded-2xl border border-line p-4" onSubmit={saveProfile}>
                        <div className="mb-4 flex items-center gap-2"><NotePencilIcon size={20} /><h4 className="m-0">Edit profile information</h4></div>
                        <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                          {detail.kind === "USER" ? (
                            <>
                              <label className="text-xs font-bold">Display name<input className="mt-1.5 w-full" value={String(edit.displayName ?? "")} onChange={(event) => setEdit((current) => ({ ...current, displayName: event.target.value }))} /></label>
                              <label className="text-xs font-bold">Username<input className="mt-1.5 w-full" value={String(edit.username ?? "")} onChange={(event) => setEdit((current) => ({ ...current, username: event.target.value }))} /></label>
                              <label className="text-xs font-bold">Phone<input className="mt-1.5 w-full" value={String(edit.phoneNumber ?? "")} onChange={(event) => setEdit((current) => ({ ...current, phoneNumber: event.target.value }))} /></label>
                              <label className="text-xs font-bold">Pronouns<input className="mt-1.5 w-full" value={String(edit.pronouns ?? "")} onChange={(event) => setEdit((current) => ({ ...current, pronouns: event.target.value }))} /></label>
                              <label className="col-span-2 text-xs font-bold max-[520px]:col-span-1">Bio<textarea className="mt-1.5 min-h-24 w-full" value={String(edit.bio ?? "")} onChange={(event) => setEdit((current) => ({ ...current, bio: event.target.value }))} /></label>
                              <label className="col-span-2 flex items-center gap-2 text-xs font-bold max-[520px]:col-span-1"><input type="checkbox" checked={Boolean(edit.isPrivate)} onChange={(event) => setEdit((current) => ({ ...current, isPrivate: event.target.checked }))} /> Private profile</label>
                            </>
                          ) : (
                            <>
                              {(["name", "address", "city", "countryCode", "phone", "website", "instagram"] as const).map((field) => <label key={field} className="text-xs font-bold">{label(field)}<input className="mt-1.5 w-full" value={String(edit[field] ?? "")} onChange={(event) => setEdit((current) => ({ ...current, [field]: event.target.value }))} /></label>)}
                              <label className="text-xs font-bold">Status<select className="mt-1.5 w-full" value={String(edit.status ?? "PENDING")} onChange={(event) => setEdit((current) => ({ ...current, status: event.target.value }))}><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="CLAIMED">Claimed</option></select></label>
                              <label className="col-span-2 text-xs font-bold max-[520px]:col-span-1">Bio<textarea className="mt-1.5 min-h-24 w-full" value={String(edit.bio ?? "")} onChange={(event) => setEdit((current) => ({ ...current, bio: event.target.value }))} /></label>
                            </>
                          )}
                        </div>
                        <button className="mt-4 w-full rounded-xl border-0 bg-ink px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
                      </form>
                      <form className="rounded-2xl border border-line p-4" onSubmit={sendChangeRequest}>
                        <div className="mb-4 flex items-center gap-2"><ShieldWarningIcon size={20} /><div><h4 className="m-0">Ask them to change something</h4><p className="mb-0 mt-1 text-xs text-muted">Creates a trackable request in support history.</p></div></div>
                        <label className="text-xs font-bold">Field or area<input className="mt-1.5 w-full" value={requestField} onChange={(event) => setRequestField(event.target.value)} placeholder="e.g. username, cover photo, address" /></label>
                        <label className="mt-3 block text-xs font-bold">Request<textarea className="mt-1.5 min-h-28 w-full" value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} placeholder="Explain what needs to be changed and why…" /></label>
                        {requestSent ? <p className="rounded-xl bg-success-soft p-3 text-xs text-success">Request recorded.</p> : null}
                        <button className="mt-3 w-full rounded-xl border-0 bg-accent px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50" disabled={saving || requestMessage.trim().length < 4}>{saving ? "Sending…" : "Create change request"}</button>
                        <div className="mt-5 border-t border-line pt-4"><h5 className="m-0">Previous requests</h5><div className="mt-2 grid gap-2">{detail.profileRequests.map((item) => <div key={item.id} className="rounded-xl bg-surface-subtle p-3"><strong className="block text-xs">{item.subject}</strong><span className="mt-1 block text-[10px] text-muted">{label(item.status)} · {formatDate(item.createdAt)}</span></div>)}{!detail.profileRequests.length ? <span className="text-xs text-muted">No previous requests.</span> : null}</div></div>
                      </form>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
