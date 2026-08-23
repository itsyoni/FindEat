import { useEffect, useMemo, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import type { KnownIssueSeverity, KnownIssueStatus, PlannedFeatureStatus, SupportTicket, SupportTicketStatus } from "@findeat/types";
import { request } from "../lib/api";

const statuses: Array<"ALL" | SupportTicketStatus> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

const statusLabels: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const categoryLabels = {
  BUG: "App problem",
  FEATURE_REQUEST: "Feature suggestion",
  ACCOUNT: "Account",
  RESTAURANT: "Restaurant",
  CONTENT: "Post or review",
  SAFETY: "Safety",
  OTHER: "Other",
};

type SupportPanelMode = "support" | "bugs" | "features";

function matchesMode(ticket: SupportTicket, mode: SupportPanelMode) {
  if (mode === "bugs") return ticket.category === "BUG";
  if (mode === "features") return ticket.category === "FEATURE_REQUEST";
  return ticket.category !== "BUG" && ticket.category !== "FEATURE_REQUEST";
}

const panelCopy: Record<SupportPanelMode, { eyebrow: string; title: string; description: string }> = {
  support: {
    eyebrow: "CUSTOMER CARE",
    title: "Help and support",
    description: "Review requests from FindEat users and keep every response in one place.",
  },
  bugs: {
    eyebrow: "BUGS & KNOWN ISSUES",
    title: "Bug workspace",
    description: "Review reports, add your own bugs, edit the public copy, and approve what appears on the Known Issues wall.",
  },
  features: {
    eyebrow: "SUGGESTIONS & ROADMAP",
    title: "Feature workspace",
    description: "Review suggestions, add your own ideas, and approve what appears on the Upcoming Features wall.",
  },
};

export function SupportTicketsPanel({ mode = "support" }: { mode?: SupportPanelMode }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof statuses)[number]>(mode === "support" ? "OPEN" : "ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<SupportTicketStatus>("OPEN");
  const [publishing, setPublishing] = useState(false);
  const [publicTitle, setPublicTitle] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [knownIssueStatus, setKnownIssueStatus] = useState<KnownIssueStatus>("INVESTIGATING");
  const [severity, setSeverity] = useState<KnownIssueSeverity>("MEDIUM");
  const [featureStatus, setFeatureStatus] = useState<PlannedFeatureStatus>("PLANNED");
  const [targetLabel, setTargetLabel] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [affectedAreas, setAffectedAreas] = useState<string[]>([]);
  const [affectedAreaDraft, setAffectedAreaDraft] = useState("");
  const [affectedAreaOptions, setAffectedAreaOptions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const relevantTickets = useMemo(
    () => tickets.filter((ticket) => matchesMode(ticket, mode)),
    [mode, tickets],
  );
  const filtered = useMemo(
    () => relevantTickets.filter((ticket) => filter === "ALL" || ticket.status === filter),
    [filter, relevantTickets],
  );
  const selected = relevantTickets.find((ticket) => ticket.id === selectedId) ?? null;

  function initializePublicEditor(ticket: SupportTicket) {
    setPublicTitle(ticket.knownIssue?.title ?? ticket.plannedFeature?.title ?? ticket.subject);
    setPublicDescription(ticket.knownIssue?.description ?? ticket.plannedFeature?.description ?? ticket.message);
    setKnownIssueStatus(ticket.knownIssue?.status ?? "INVESTIGATING");
    setSeverity(ticket.knownIssue?.severity ?? "MEDIUM");
    setFeatureStatus(ticket.plannedFeature?.status ?? "PLANNED");
    setTargetLabel(ticket.plannedFeature?.targetLabel ?? "");
    setIsPublic(ticket.knownIssue?.isPublic ?? true);
    setAffectedAreas(ticket.knownIssue?.affectedAreas ?? []);
    setAffectedAreaDraft("");
  }

  function sourceLabel(ticket: SupportTicket) {
    if (ticket.user?.isAdmin || ticket.submitterName === "FindEat admin") return "Admin";
    return ticket.submittedFromWeb ? "Web" : "App";
  }

  function addAffectedArea(value = affectedAreaDraft) {
    const next = value.trim();
    if (!next || affectedAreas.some((item) => item.toLocaleLowerCase() === next.toLocaleLowerCase())) return;
    setAffectedAreas((current) => [...current, next]);
    setAffectedAreaOptions((current) => current.some((item) => item.toLocaleLowerCase() === next.toLocaleLowerCase()) ? current : [...current, next].sort());
    setAffectedAreaDraft("");
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = await request<SupportTicket[]>("/admin/support-tickets", {
        cache: "reload",
      });
      setTickets(next);
      const relevant = next.filter((ticket) => matchesMode(ticket, mode));
      setSelectedId((current) =>
        current && relevant.some((ticket) => ticket.id === current)
          ? current
          : relevant.find((ticket) => ticket.status === "OPEN")?.id ?? relevant[0]?.id ?? null,
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load support tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    request<SupportTicket[]>("/admin/support-tickets")
      .then((next) => {
        if (!active) return;
        setTickets(next);
        const relevant = next.filter((ticket) => matchesMode(ticket, mode));
        const first = relevant.find((ticket) => ticket.status === "OPEN") ?? relevant[0];
        setSelectedId(first?.id ?? null);
        setReply(first?.adminReply ?? "");
        setStatus(first?.status ?? "OPEN");
        if (first) initializePublicEditor(first);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Could not load support tickets");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [mode]);

  useEffect(() => {
    if (mode !== "bugs") return;
    let active = true;
    request<Array<{ affectedAreas?: string[] }>>("/admin/known-issues")
      .then((issues) => {
        if (!active) return;
        const options = [...new Set(issues.flatMap((issue) => issue.affectedAreas ?? []).map((item) => item.trim()).filter(Boolean))].sort();
        setAffectedAreaOptions(options);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [mode]);

  function selectTicket(ticket: SupportTicket) {
    setSelectedId(ticket.id);
    setReply(ticket.adminReply ?? "");
    setStatus(ticket.status);
    initializePublicEditor(ticket);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await request<SupportTicket>(`/admin/support-tickets/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ adminReply: reply, status }),
      });
      setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not update ticket");
    } finally {
      setSaving(false);
    }
  }

  async function createAdminDraft() {
    if (mode === "support" || newTitle.trim().length < 4 || newDescription.trim().length < 10) return;
    setCreatingTicket(true);
    setError("");
    try {
      const created = await request<SupportTicket>("/admin/support-tickets", {
        method: "POST",
        body: JSON.stringify({
          category: mode === "bugs" ? "BUG" : "FEATURE_REQUEST",
          subject: newTitle.trim(),
          message: newDescription.trim(),
        }),
      });
      setTickets((current) => [created, ...current]);
      selectTicket(created);
      setFilter("ALL");
      setCreating(false);
      setNewTitle("");
      setNewDescription("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create this draft");
    } finally {
      setCreatingTicket(false);
    }
  }

  async function publish() {
    if (!selected || (mode !== "bugs" && mode !== "features")) return;
    const pendingArea = affectedAreaDraft.trim();
    const nextAffectedAreas = pendingArea && !affectedAreas.some((item) => item.toLocaleLowerCase() === pendingArea.toLocaleLowerCase())
      ? [...affectedAreas, pendingArea]
      : affectedAreas;
    setPublishing(true);
    setError("");
    try {
      const updated = await request<SupportTicket>(`/admin/support-tickets/${selected.id}/publish`, {
        method: "POST",
        body: JSON.stringify({
          title: publicTitle,
          description: publicDescription,
          ...(mode === "bugs" ? { knownIssueStatus, severity, isPublic, affectedAreas: nextAffectedAreas } : { plannedFeatureStatus: featureStatus, targetLabel: targetLabel || undefined }),
        }),
      });
      setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
      setStatus(updated.status);
      if (mode === "bugs") {
        setAffectedAreas(nextAffectedAreas);
        setAffectedAreaDraft("");
        setAffectedAreaOptions((current) => [...new Set([...current, ...nextAffectedAreas])].sort());
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not publish this item");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-5 max-[800px]:gap-3.5">
        <div>
          <p className="mb-2 text-xs font-black tracking-[.12em] text-accent">{panelCopy[mode].eyebrow}</p>
          <h2 className="mb-2 text-[clamp(28px,4vw,42px)] leading-tight tracking-[-.04em]">{panelCopy[mode].title}</h2>
          <p className="m-0 text-muted max-[800px]:hidden">{panelCopy[mode].description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {mode !== "support" ? <button className="flex min-h-11 items-center gap-1.75 rounded-xl border-0 bg-ink px-4 py-3 font-extrabold text-surface" onClick={() => setCreating(true)}>
            <PlusIcon size={18} weight="bold" /> {mode === "bugs" ? "Add bug" : "Add feature"}
          </button> : null}
          <button className="flex min-h-11 items-center gap-1.75 rounded-xl border border-line bg-soft px-4 py-3 font-extrabold text-ink disabled:opacity-55" onClick={() => void load()} disabled={loading}>
            <ArrowClockwiseIcon size={18} weight="bold" /> Refresh
          </button>
        </div>
      </div>
      {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger [color:#b54635] [border:0] [background:none] [font-weight:700] [color:var(--danger)]">{error}</p>}
      <div className="my-4 mb-4 flex shrink-0 gap-2 overflow-x-auto pb-0.5 min-[801px]:mt-5.5" role="tablist" aria-label="Ticket status">
        {statuses.map((item) => (
          <button key={item} className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3.25 py-2.25 text-[13px] ${filter === item ? "border-ink bg-ink text-surface" : "border-line bg-surface text-muted"}`} onClick={() => setFilter(item)}>
            {item === "ALL" ? "All" : statusLabels[item]}
            <span className="min-w-5 rounded-full bg-current/12 px-1.5 py-0.5 text-[11px] font-extrabold">{relevantTickets.filter((ticket) => item === "ALL" || ticket.status === item).length}</span>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,36%)_minmax(0,1fr)] overflow-hidden rounded-[22px] border border-line bg-surface shadow-panel max-[800px]:grid-cols-1 max-[800px]:grid-rows-[minmax(130px,36%)_minmax(0,1fr)]">
        <section className="min-h-0 overflow-y-auto overscroll-contain border-r border-line max-[800px]:border-r-0 max-[800px]:border-b">
          {loading ? <div className="grid min-h-75 place-items-center p-7 text-center text-muted">Loading requests…</div> : filtered.length === 0 ? (
            <div className="m-5 grid place-items-center rounded-2xl bg-soft p-8 text-center text-muted">
              <CheckCircleIcon size={30} weight="duotone" />
              <h3 className="mt-3 mb-1 text-ink">No tickets here</h3>
              <p className="m-0">There are no requests with this status.</p>
            </div>
          ) : filtered.map((ticket) => (
            <button key={ticket.id} className={`grid w-full grid-cols-[44px_minmax(0,1fr)] items-start gap-3 border-0 border-b border-line bg-transparent p-3.75 text-left text-ink hover:bg-soft ${selectedId === ticket.id ? "bg-soft shadow-[inset_3px_0_var(--accent)]" : ""}`} onClick={() => selectTicket(ticket)}>
              {ticket.user?.avatarUrl ? <img className="size-11 rounded-full object-cover" src={ticket.user.avatarUrl} alt="" /> : <span className="grid size-11 place-items-center rounded-full bg-accent-soft font-black text-ink">{(ticket.user?.username ?? ticket.submitterName)?.charAt(0)?.toUpperCase() ?? "?"}</span>}
              <span className="grid min-w-0 gap-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-[13px]">{ticket.user?.username ?? ticket.submitterName ?? "Website visitor"}</strong>
                  <time className="text-[11px] text-muted">{new Date(ticket.createdAt).toLocaleDateString()}</time>
                </span>
                <b className="truncate text-sm">{ticket.subject}</b>
                <small className="text-[11px] text-muted">{ticket.restaurant ? `${ticket.restaurant.name} · ` : ""}{categoryLabels[ticket.category]} · {sourceLabel(ticket)} · {statusLabels[ticket.status]}</small>
              </span>
            </button>
          ))}
        </section>

        <section className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-7 max-[800px]:p-5">
          {!selected ? <div className="grid min-h-75 place-items-center p-7 text-center text-muted">Select a request to read and reply.</div> : (
            <>
              <div className="flex items-start justify-between gap-5 border-b border-line pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-black tracking-[.08em] text-accent uppercase">{categoryLabels[selected.category]}</span><span className="rounded-full bg-soft px-2 py-1 text-[10px] font-black uppercase tracking-[.06em] text-muted">From {sourceLabel(selected)}</span></div>
                  <h3 className="my-1.25 text-[25px]">{selected.subject}</h3>
                  <p className="m-0 text-[13px] text-muted">{selected.user?.username ?? selected.submitterName ?? "Website visitor"}{selected.user?.email || selected.submitterEmail ? ` · ${selected.user?.email ?? selected.submitterEmail}` : ""}</p>
                  {selected.restaurant && <p className="m-0 mt-1 text-[13px] text-muted">Restaurant: <strong>{selected.restaurant.name}</strong></p>}
                </div>
                <span className={`whitespace-nowrap rounded-full px-2.5 py-1.75 text-[11px] font-black ${selected.status === "RESOLVED" || selected.status === "CLOSED" ? "bg-success-soft text-success" : "bg-soft text-ink"}`}>{statusLabels[selected.status]}</span>
              </div>
              <div className="my-5.5 rounded-2xl bg-soft p-4.5">
                <small className="mb-1.75 block text-[11px] font-extrabold tracking-[.05em] text-muted uppercase">User message</small>
                <p className="m-0 whitespace-pre-wrap leading-[1.55]">{selected.message}</p>
              </div>
              {selected.attachments?.length ? (
                <div className="mt-4.5">
                  <small className="mb-2 block font-bold text-muted">Attachments</small>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5">
                    {selected.attachments.map((attachment, index) =>
                      attachment.type === "VIDEO" ? (
                        <video className="aspect-4/5 w-full rounded-[14px] bg-[#24221f] object-cover" key={`${attachment.url}-${index}`} src={attachment.url} controls preload="metadata" />
                      ) : (
                        <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer">
                          <img className="aspect-4/5 w-full rounded-[14px] bg-[#24221f] object-cover" src={attachment.url} alt={`Bug report attachment ${index + 1}`} />
                        </a>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
              {(mode === "bugs" || mode === "features") ? (
                <div className="my-5.5 rounded-2xl border border-line bg-surface-subtle p-4.5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div><small className="block text-[11px] font-extrabold uppercase tracking-[.06em] text-accent">Public page</small><strong className="mt-1 block">Edit before publishing</strong></div>
                    {(selected.knownIssue || selected.plannedFeature) ? <span className="rounded-full bg-success-soft px-2.5 py-1.5 text-[11px] font-black text-success">Published</span> : <span className="rounded-full bg-soft px-2.5 py-1.5 text-[11px] font-black text-muted">Not public</span>}
                  </div>
                  <div className="grid gap-3">
                    <label className="grid gap-1.5 text-xs font-extrabold text-muted">Public title
                      <input className="min-h-11 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none focus:border-accent" value={publicTitle} onChange={(event) => setPublicTitle(event.target.value)} maxLength={140} />
                    </label>
                    <label className="grid gap-1.5 text-xs font-extrabold text-muted">Public description
                      <textarea className="min-h-25 resize-y rounded-xl border border-line bg-surface p-3.5 text-sm leading-5 text-ink outline-none focus:border-accent" value={publicDescription} onChange={(event) => setPublicDescription(event.target.value)} maxLength={2000} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {mode === "bugs" ? <>
                        <label className="grid gap-1.5 text-xs font-extrabold text-muted">Public status<select className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink" value={knownIssueStatus} onChange={(event) => setKnownIssueStatus(event.target.value as KnownIssueStatus)}><option value="INVESTIGATING">Investigating</option><option value="IN_PROGRESS">In progress</option><option value="FIXED_NEXT_RELEASE">Fixed next release</option><option value="RESOLVED">Resolved</option></select></label>
                        <label className="grid gap-1.5 text-xs font-extrabold text-muted">Severity<select className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink" value={severity} onChange={(event) => setSeverity(event.target.value as KnownIssueSeverity)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
                      </> : <>
                        <label className="grid gap-1.5 text-xs font-extrabold text-muted">Roadmap status<select className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink" value={featureStatus} onChange={(event) => setFeatureStatus(event.target.value as PlannedFeatureStatus)}><option value="PLANNED">Planned</option><option value="IN_PROGRESS">In progress</option><option value="COMING_SOON">Coming soon</option><option value="RELEASED">Released</option></select></label>
                        <label className="grid gap-1.5 text-xs font-extrabold text-muted">Target <span className="font-normal">(optional)</span><input className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent" value={targetLabel} onChange={(event) => setTargetLabel(event.target.value)} maxLength={80} placeholder="Later this year" /></label>
                      </>}
                    </div>
                    {mode === "bugs" ? <>
                      <label className="grid gap-1.5 text-xs font-extrabold text-muted">Affected areas
                        <span className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-2.5 focus-within:border-accent">
                          <input
                            className="min-w-0 flex-1 border-0 bg-transparent px-1 text-sm text-ink outline-none"
                            value={affectedAreaDraft}
                            list="known-issue-area-suggestions"
                            placeholder="Add or choose a tag"
                            onChange={(event) => setAffectedAreaDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === ",") {
                                event.preventDefault();
                                addAffectedArea();
                              }
                            }}
                          />
                          <button type="button" className="shrink-0 rounded-lg bg-soft px-2.5 py-1.5 text-xs font-extrabold text-ink" onClick={() => addAffectedArea()}>Add</button>
                        </span>
                        <datalist id="known-issue-area-suggestions">{affectedAreaOptions.map((area) => <option key={area} value={area} />)}</datalist>
                      </label>
                      {affectedAreas.length ? <div className="flex flex-wrap gap-2">{affectedAreas.map((area) => <span key={area} className="inline-flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-1.5 text-xs font-extrabold text-ink">{area}<button type="button" className="grid size-4 place-items-center rounded-full border-0 bg-transparent p-0 text-muted" aria-label={`Remove ${area}`} onClick={() => setAffectedAreas((current) => current.filter((item) => item !== area))}><XIcon size={11} weight="bold" /></button></span>)}</div> : null}
                      <label className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl bg-soft px-3 py-2.5">
                        <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="size-4 shrink-0 accent-accent" />
                        <span className="min-w-0 text-sm font-extrabold text-ink">Visible to users</span>
                      </label>
                    </> : null}
                    <button type="button" onClick={() => void publish()} disabled={publishing || publicTitle.trim().length < 4 || publicDescription.trim().length < 10} className="min-h-11 rounded-xl border-0 bg-accent px-4 font-extrabold text-[#faf9f6] disabled:opacity-50">{publishing ? "Saving…" : selected.knownIssue || selected.plannedFeature ? "Update public wall" : mode === "bugs" && !isPublic ? "Approve & save privately" : "Approve & publish"}</button>
                  </div>
                </div>
              ) : null}
              <label>
                <span className="mb-1.75 block text-[11px] font-extrabold tracking-[.05em] text-muted uppercase">{selected.user?.isAdmin || selected.submitterName === "FindEat admin" ? "Admin notes" : "Reply to the user"}</span>
                <textarea className="min-h-37.5 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-ink outline-none focus:border-ink focus:ring-3 focus:ring-ink/5" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} placeholder="Write a helpful response…" />
              </label>
              <div className="mt-4 flex items-end justify-between gap-4 max-[800px]:flex-col max-[800px]:items-stretch">
                <label className="min-w-45 max-[800px]:min-w-0">
                  <span className="mb-1.75 block text-[11px] font-extrabold tracking-[.05em] text-muted uppercase">Status</span>
                  <select className="w-full rounded-xl border border-line bg-surface p-2.75 text-ink" value={status} onChange={(event) => setStatus(event.target.value as SupportTicketStatus)}>
                    {statuses.slice(1).map((item) => <option key={item} value={item}>{statusLabels[item as SupportTicketStatus]}</option>)}
                  </select>
                </label>
                <button className="min-h-11 rounded-xl border-0 bg-ink px-4 py-3 font-extrabold text-surface disabled:opacity-55" onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : selected.user?.isAdmin || selected.submitterName === "FindEat admin" ? "Save notes" : "Save response"}
                </button>
              </div>
              {selected.handledBy && <small className="mt-3.5 block text-muted">Last handled by {selected.handledBy.username}</small>}
            </>
          )}
        </section>
      </div>
      {creating && mode !== "support" ? <div className="fixed inset-0 z-1000 grid place-items-center bg-[#171717]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={mode === "bugs" ? "Add bug" : "Add feature"} onMouseDown={(event) => { if (event.target === event.currentTarget) setCreating(false); }}>
        <div className="w-full max-w-lg rounded-[22px] border border-line bg-surface p-5 shadow-panel sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="m-0 text-xs font-black uppercase tracking-[.1em] text-accent">Admin draft</p><h3 className="m-0 mt-1 text-2xl font-black text-ink">{mode === "bugs" ? "Add a bug" : "Add a feature"}</h3><p className="m-0 mt-2 text-sm leading-5 text-muted">This stays in the review queue until you approve and publish it.</p></div>
            <button type="button" className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-soft text-ink" onClick={() => setCreating(false)} aria-label="Close"><XIcon size={17} weight="bold" /></button>
          </div>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-xs font-extrabold text-muted">Title<input autoFocus className="min-h-11 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none focus:border-accent" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={140} /></label>
            <label className="grid gap-1.5 text-xs font-extrabold text-muted">Details<textarea className="min-h-32 resize-y rounded-xl border border-line bg-surface p-3.5 text-sm leading-5 text-ink outline-none focus:border-accent" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} maxLength={5000} /></label>
          </div>
          <div className="mt-5 flex justify-end gap-2"><button type="button" className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-extrabold text-ink" onClick={() => setCreating(false)}>Cancel</button><button type="button" className="min-h-11 rounded-xl border-0 bg-ink px-4 text-sm font-extrabold text-surface disabled:opacity-45" disabled={creatingTicket || newTitle.trim().length < 4 || newDescription.trim().length < 10} onClick={() => void createAdminDraft()}>{creatingTicket ? "Adding…" : "Add to review queue"}</button></div>
        </div>
      </div> : null}
    </>
  );
}
