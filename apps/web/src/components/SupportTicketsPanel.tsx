import { useEffect, useMemo, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
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
    eyebrow: "BUG REPORTS",
    title: "Reported bugs",
    description: "Review technical problems and evidence submitted by FindEat users.",
  },
  features: {
    eyebrow: "FEATURE SUGGESTIONS",
    title: "Suggested features",
    description: "Review ideas and product suggestions submitted by FindEat users.",
  },
};

export function SupportTicketsPanel({ mode = "support" }: { mode?: SupportPanelMode }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof statuses)[number]>("OPEN");
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

  async function publish() {
    if (!selected || (mode !== "bugs" && mode !== "features")) return;
    setPublishing(true);
    setError("");
    try {
      const updated = await request<SupportTicket>(`/admin/support-tickets/${selected.id}/publish`, {
        method: "POST",
        body: JSON.stringify({
          title: publicTitle,
          description: publicDescription,
          ...(mode === "bugs" ? { knownIssueStatus, severity } : { plannedFeatureStatus: featureStatus, targetLabel: targetLabel || undefined }),
        }),
      });
      setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
      setStatus(updated.status);
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
        <button className="flex min-h-11 items-center gap-1.75 rounded-xl border border-line bg-soft px-4 py-3 font-extrabold text-ink disabled:opacity-55" onClick={() => void load()} disabled={loading}>
          <ArrowClockwiseIcon size={18} weight="bold" /> Refresh
        </button>
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
                <small className="text-[11px] text-muted">{ticket.restaurant ? `${ticket.restaurant.name} · ` : ""}{categoryLabels[ticket.category]} · {statusLabels[ticket.status]}</small>
              </span>
            </button>
          ))}
        </section>

        <section className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-7 max-[800px]:p-5">
          {!selected ? <div className="grid min-h-75 place-items-center p-7 text-center text-muted">Select a request to read and reply.</div> : (
            <>
              <div className="flex items-start justify-between gap-5 border-b border-line pb-5">
                <div>
                  <span className="text-[11px] font-black tracking-[.08em] text-accent uppercase">{categoryLabels[selected.category]}</span>
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
                    <button type="button" onClick={() => void publish()} disabled={publishing || publicTitle.trim().length < 4 || publicDescription.trim().length < 10} className="min-h-11 rounded-xl border-0 bg-accent px-4 font-extrabold text-[#faf9f6] disabled:opacity-50">{publishing ? "Publishing…" : selected.knownIssue || selected.plannedFeature ? "Update public page" : "Publish to public page"}</button>
                  </div>
                </div>
              ) : null}
              <label>
                <span className="mb-1.75 block text-[11px] font-extrabold tracking-[.05em] text-muted uppercase">Reply to the user</span>
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
                  {saving ? "Saving…" : "Save response"}
                </button>
              </div>
              {selected.handledBy && <small className="mt-3.5 block text-muted">Last handled by {selected.handledBy.username}</small>}
            </>
          )}
        </section>
      </div>
    </>
  );
}
