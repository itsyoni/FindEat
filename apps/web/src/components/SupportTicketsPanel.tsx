import { useEffect, useMemo, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import type { SupportTicket, SupportTicketStatus } from "@findeat/types";
import { request } from "../lib/api";
import { AppLink } from "./AppLink";
import { adminPaths } from "../lib/navigation";

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

  const relevantTickets = useMemo(
    () => tickets.filter((ticket) => matchesMode(ticket, mode)),
    [mode, tickets],
  );
  const filtered = useMemo(
    () => relevantTickets.filter((ticket) => filter === "ALL" || ticket.status === filter),
    [filter, relevantTickets],
  );
  const selected = relevantTickets.find((ticket) => ticket.id === selectedId) ?? null;

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

  return (
    <>
      <div className="support-section-switcher" role="tablist" aria-label="Admin inbox type">
        <AppLink to={adminPaths.support} role="tab" aria-selected={mode === "support"} className={mode === "support" ? "active" : ""}>Support</AppLink>
        <AppLink to={adminPaths.bugs} role="tab" aria-selected={mode === "bugs"} className={mode === "bugs" ? "active" : ""}>Bug reports</AppLink>
        <AppLink to={adminPaths.features} role="tab" aria-selected={mode === "features"} className={mode === "features" ? "active" : ""}>Feature suggestions</AppLink>
      </div>
      <div className="page-heading support-heading">
        <div>
          <p className="eyebrow">{panelCopy[mode].eyebrow}</p>
          <h2>{panelCopy[mode].title}</h2>
          <p className="muted">{panelCopy[mode].description}</p>
        </div>
        <button className="secondary support-refresh" onClick={() => void load()} disabled={loading}>
          <ArrowClockwiseIcon size={18} weight="bold" /> Refresh
        </button>
      </div>
      {error && <p className="error banner">{error}</p>}
      <div className="support-filters" role="tablist" aria-label="Ticket status">
        {statuses.map((item) => (
          <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
            {item === "ALL" ? "All" : statusLabels[item]}
            <span>{relevantTickets.filter((ticket) => item === "ALL" || ticket.status === item).length}</span>
          </button>
        ))}
      </div>

      <div className="support-workspace">
        <section className="support-ticket-list">
          {loading ? <div className="support-loading">Loading requests…</div> : filtered.length === 0 ? (
            <div className="empty support-empty">
              <CheckCircleIcon size={30} weight="duotone" />
              <h3>No tickets here</h3>
              <p>There are no requests with this status.</p>
            </div>
          ) : filtered.map((ticket) => (
            <button key={ticket.id} className={`support-ticket-row ${selectedId === ticket.id ? "selected" : ""}`} onClick={() => selectTicket(ticket)}>
              {ticket.user?.avatarUrl ? <img src={ticket.user.avatarUrl} alt="" /> : <span className="support-avatar">{ticket.user?.username?.charAt(0) ?? "?"}</span>}
              <span className="support-ticket-copy">
                <span className="support-ticket-meta">
                  <strong>{ticket.user?.username ?? "FindEat user"}</strong>
                  <time>{new Date(ticket.createdAt).toLocaleDateString()}</time>
                </span>
                <b>{ticket.subject}</b>
                <small>{ticket.restaurant ? `${ticket.restaurant.name} · ` : ""}{categoryLabels[ticket.category]} · {statusLabels[ticket.status]}</small>
              </span>
            </button>
          ))}
        </section>

        <section className="support-ticket-detail">
          {!selected ? <div className="support-detail-empty">Select a request to read and reply.</div> : (
            <>
              <div className="support-detail-head">
                <div>
                  <span>{categoryLabels[selected.category]}</span>
                  <h3>{selected.subject}</h3>
                  <p>{selected.user?.username} · {selected.user?.email}</p>
                  {selected.restaurant && <p className="support-restaurant-context">Restaurant: <strong>{selected.restaurant.name}</strong></p>}
                </div>
                <span className={`support-status ${selected.status.toLowerCase()}`}>{statusLabels[selected.status]}</span>
              </div>
              <div className="support-message">
                <small>User message</small>
                <p>{selected.message}</p>
              </div>
              {selected.attachments?.length ? (
                <div className="support-attachments">
                  <small>Attachments</small>
                  <div>
                    {selected.attachments.map((attachment, index) =>
                      attachment.type === "VIDEO" ? (
                        <video key={`${attachment.url}-${index}`} src={attachment.url} controls preload="metadata" />
                      ) : (
                        <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer">
                          <img src={attachment.url} alt={`Bug report attachment ${index + 1}`} />
                        </a>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
              <label className="support-reply">
                <span>Reply to the user</span>
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} placeholder="Write a helpful response…" />
              </label>
              <div className="support-detail-actions">
                <label>
                  <span>Status</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value as SupportTicketStatus)}>
                    {statuses.slice(1).map((item) => <option key={item} value={item}>{statusLabels[item as SupportTicketStatus]}</option>)}
                  </select>
                </label>
                <button className="primary" onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save response"}
                </button>
              </div>
              {selected.handledBy && <small className="support-handler">Last handled by {selected.handledBy.username}</small>}
            </>
          )}
        </section>
      </div>
    </>
  );
}
