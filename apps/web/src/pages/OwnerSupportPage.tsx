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
  FEATURE_REQUEST: "Feature suggestion",
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
    <div className="page-stack [width:min(1120px,100%)] [margin:auto] [padding:46px_42px_70px] [.restaurant-setup-shell>&]:[width:min(960px,100%)] [.restaurant-setup-shell>&]:[margin:auto] max-[800px]:[padding:30px_18px] max-[800px]:[width:100%] max-[800px]:[padding:26px_clamp(14px,4vw,22px)_calc(42px_+_env(safe-area-inset-bottom))] max-[380px]:[padding-inline:12px] owner-support-page">
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">RESTAURANT SUPPORT</p>
          <h2>Help and support</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">Get help managing {restaurant.name} and follow every request here.</p>
        </div>
        <button className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]" onClick={() => void refresh()} disabled={loading}>Refresh requests</button>
      </div>

      <div className="owner-support-grid [display:grid] [grid-template-columns:minmax(300px,.78fr)_minmax(0,1.22fr)] [gap:20px] [align-items:start] max-[900px]:[grid-template-columns:1fr]">
        <form className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] owner-support-form [display:grid] [gap:16px] [padding:24px] [position:sticky] [top:24px] [&_h3]:[margin:0] [&>p]:[margin:0] [&>p]:[color:var(--muted)] [&>p]:[font-size:13px] [&>p]:[line-height:1.5] [&_label>span]:[display:block] [&_label>span]:[margin-bottom:7px] [&_label>span]:[color:var(--muted)] [&_label>span]:[font-size:11px] [&_label>span]:[font-weight:800] [&_label>span]:[letter-spacing:.05em] [&_label>span]:[text-transform:uppercase] [&_select]:[width:100%] [&_input]:[width:100%] [&_textarea]:[width:100%] [&_textarea]:[min-height:140px] [&_textarea]:[resize:vertical] [&_.primary]:[width:100%] max-[900px]:[position:static] max-[600px]:[padding:18px]" onSubmit={(event) => void submit(event)}>
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
          {error && <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p>}
          {sent && <p className="success [color:var(--green)] [font-weight:700] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">Your request was sent. We’ll reply here.</p>}
          <button className="primary [.login-card_&]:[min-height:49px] [.login-card_&]:[margin-top:2px] [.login-card_&]:[background:var(--accent)] [.login-card_&]:[color:#faf9f6] [.login-card_&]:[box-shadow:0_10px_24px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.login-card_&]:[transition:background-color_0.16s_ease,_box-shadow_0.16s_ease,_transform_0.16s_ease] [.login-card_&:hover:not(:disabled)]:[background:color-mix(in_srgb,_var(--accent)_88%,_#9c2e19)] [.login-card_&:hover:not(:disabled)]:[box-shadow:0_13px_28px_color-mix(in_srgb,_var(--accent)_31%,_transparent)] [.login-card_&:hover:not(:disabled)]:[transform:translateY(-1px)] [.login-card_&:active:not(:disabled)]:[transform:translateY(0)] [.login-card_&:disabled]:[cursor:not-allowed] [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--ink)] [color:#faf9f6] [&:hover]:[background:#333] [&:disabled]:[opacity:0.55] [.error-page-actions_&]:[background:var(--accent)] [.error-page-actions_&]:[color:#171717] [.error-page-actions_&]:[box-shadow:0_12px_30px_color-mix(in_srgb,_var(--accent)_25%,_transparent)] [.error-page-actions_&:hover]:[background:color-mix(in_srgb,_var(--accent)_88%,_var(--ink))] [.error-page-actions_&:hover]:[transform:translateY(-1px)] [&.compact]:[padding:9px_13px] [&.compact]:[font-size:12px] [&.compact]:[white-space:nowrap] [.owner-support-form_&]:[width:100%] dark:[color:#171717] dark:[&:hover]:[background:color-mix(in_srgb,_var(--ink)_82%,_var(--accent))]" disabled={sending || subject.trim().length < 3 || message.trim().length < 10}>
            {sending ? "Sending…" : "Send request"}
          </button>
        </form>

        <section className="owner-ticket-history [display:grid] [gap:12px] [min-width:0] [&_.section-title]:[margin-bottom:2px]">
          <div className="section-title [&_h3]:[margin:0] [&_p]:[margin:0] [&_p]:[margin-top:5px] [&_p]:[color:var(--muted)] [&_p]:[font-size:13px] [.owner-ticket-history_&]:[margin-bottom:2px] max-[800px]:[&>div]:[min-width:0]">
            <div><h3>Your requests</h3><p>Replies from FindEat support appear here.</p></div>
          </div>
          {loading ? <div className="support-loading [display:grid] [min-height:300px] [place-items:center] [padding:28px] [color:var(--muted)] [text-align:center]">Loading requests…</div> : tickets.length === 0 ? (
            <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]">
              <CheckCircleIcon size={30} weight="duotone" />
              <h3>No support requests yet</h3>
              <p>Everything you send about {restaurant.name} will appear here.</p>
            </div>
          ) : tickets.map((ticket) => (
            <article className="card [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [.performance-grid>&]:[padding:25px] [.pro-secondary-grid>&]:[padding:23px] max-[600px]:[.pro-secondary-grid>&]:[padding:18px] owner-ticket-card [padding:20px] [&>time]:[display:block] [&>time]:[margin-top:14px] [&>time]:[color:var(--muted)] [&>time]:[font-size:11px] max-[600px]:[padding:18px]" key={ticket.id}>
              <div className="owner-ticket-head [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:14px] [&_small]:[color:var(--accent-dark)] [&_small]:[font-weight:900] [&_small]:[text-transform:uppercase] [&_small]:[letter-spacing:.06em] [&_h3]:[margin:4px_0_0] max-[600px]:[align-items:flex-start] max-[600px]:[flex-direction:column]">
                <div><small>{categoryLabels[ticket.category]}</small><h3>{ticket.subject}</h3></div>
                <span className={`support-status [border-radius:999px] [padding:7px_10px] [background:var(--soft)] [color:var(--text)] [white-space:nowrap] [font-size:11px] [font-weight:900] [&.resolved]:[background:#dff5e5] [&.resolved]:[color:#196537] [&.closed]:[background:#dff5e5] [&.closed]:[color:#196537] [&.resolved]:[background:var(--success-soft)] [&.resolved]:[color:var(--success)] [&.closed]:[background:var(--success-soft)] [&.closed]:[color:var(--success)] ${ticket.status.toLowerCase()}`}>{statusLabels[ticket.status]}</span>
              </div>
              <p className="owner-ticket-message [margin:16px_0] [white-space:pre-wrap] [line-height:1.55]">{ticket.message}</p>
              {ticket.adminReply ? <div className="owner-ticket-reply [margin:14px_0] [padding:14px] [border-left:4px_solid_var(--accent)] [border-radius:12px] [background:var(--soft)] [&_strong]:[font-size:12px] [&_p]:[margin:5px_0_0] [&_p]:[white-space:pre-wrap] [&_p]:[line-height:1.5]"><strong>FindEat support</strong><p>{ticket.adminReply}</p></div> : <small className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">Awaiting a response</small>}
              <time>{new Date(ticket.createdAt).toLocaleString()}</time>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
