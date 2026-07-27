import { useEffect, useState } from "react";
import type {
  ManagedRestaurant,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketStatus,
} from "@findeat/types";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { request } from "../lib/api";

const categories: SupportTicketCategory[] = [
  "RESTAURANT",
  "ACCOUNT",
  "CONTENT",
  "BUG",
  "OTHER",
];

const categoryLabels: Record<SupportTicketCategory, string> = {
  RESTAURANT: "Restaurant management",
  ACCOUNT: "Account and access",
  CONTENT: "Posts and reviews",
  BUG: "Technical problem",
  SAFETY: "Safety",
  OTHER: "Something else",
};

const statusLabels: Record<SupportTicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function OwnerSupportPage({ restaurant }: { restaurant: ManagedRestaurant }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [category, setCategory] = useState<SupportTicketCategory>("RESTAURANT");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setTickets(
        await request<SupportTicket[]>(
          `/support/tickets/me?restaurantId=${encodeURIComponent(restaurant.id)}`,
          { cache: "reload" },
        ),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load support requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    request<SupportTicket[]>(
      `/support/tickets/me?restaurantId=${encodeURIComponent(restaurant.id)}`,
    )
      .then((next) => {
        if (active) setTickets(next);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Could not load support requests");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [restaurant.id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (subject.trim().length < 3 || message.trim().length < 10) return;
    setSending(true);
    setError("");
    setSent(false);
    try {
      const ticket = await request<SupportTicket>("/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          restaurantId: restaurant.id,
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      setTickets((current) => [ticket, ...current]);
      setSubject("");
      setMessage("");
      setSent(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not send your request");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-stack owner-support-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">RESTAURANT SUPPORT</p>
          <h2>Help and support</h2>
          <p className="muted">Get help managing {restaurant.name} and follow every request here.</p>
        </div>
        <button className="secondary" onClick={() => void refresh()} disabled={loading}>Refresh requests</button>
      </div>

      <div className="owner-support-grid">
        <form className="card owner-support-form" onSubmit={(event) => void submit(event)}>
          <h3>Contact FindEat support</h3>
          <p>Tell us what you need help with. This request will include the selected restaurant.</p>
          <label>
            <span>Topic</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}>
              {categories.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}
            </select>
          </label>
          <label>
            <span>Subject</span>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} placeholder="Briefly describe the issue" />
          </label>
          <label>
            <span>Details</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} placeholder="Include the details our support team will need…" />
          </label>
          {error && <p className="error banner">{error}</p>}
          {sent && <p className="success banner">Your request was sent. We’ll reply here.</p>}
          <button className="primary" disabled={sending || subject.trim().length < 3 || message.trim().length < 10}>
            {sending ? "Sending…" : "Send request"}
          </button>
        </form>

        <section className="owner-ticket-history">
          <div className="section-title">
            <div><h3>Your requests</h3><p>Replies from FindEat support appear here.</p></div>
          </div>
          {loading ? <div className="support-loading">Loading requests…</div> : tickets.length === 0 ? (
            <div className="empty">
              <CheckCircleIcon size={30} weight="duotone" />
              <h3>No support requests yet</h3>
              <p>Everything you send about {restaurant.name} will appear here.</p>
            </div>
          ) : tickets.map((ticket) => (
            <article className="card owner-ticket-card" key={ticket.id}>
              <div className="owner-ticket-head">
                <div><small>{categoryLabels[ticket.category]}</small><h3>{ticket.subject}</h3></div>
                <span className={`support-status ${ticket.status.toLowerCase()}`}>{statusLabels[ticket.status]}</span>
              </div>
              <p className="owner-ticket-message">{ticket.message}</p>
              {ticket.adminReply ? <div className="owner-ticket-reply"><strong>FindEat support</strong><p>{ticket.adminReply}</p></div> : <small className="muted">Awaiting a response</small>}
              <time>{new Date(ticket.createdAt).toLocaleString()}</time>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
