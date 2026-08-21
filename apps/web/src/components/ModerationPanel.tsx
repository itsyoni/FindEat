import { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import type {
  ModerationReport,
  ReportStatus,
} from "@findeat/types";
import { request } from "../lib/api";
import { UserIdentity } from "./UserIdentity";
import { confirmAction } from "../lib/appConfirm";
import { promptAction } from "../lib/appPrompt";

const reasonLabels: Record<ModerationReport["reason"], string> = {
  WRONG_RESTAURANT: "Wrong restaurant association",
  COPYRIGHT_INFRINGEMENT: "Copyright infringement",
  HATE_SPEECH: "Hate speech",
  HARASSMENT: "Harassment or bullying",
  SPAM: "Spam",
  FALSE_INFORMATION: "False information",
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  OTHER: "Other",
};

export function ModerationPanel() {
  const [status, setStatus] = useState<ReportStatus>("PENDING");
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [appeals, setAppeals] = useState<Array<{
    id: string;
    reason: string;
    status: string;
    user: { username: string; displayName?: string | null; avatarUrl?: string | null };
    action: { action: string; reason: string; post?: { id: string } | null };
  }>>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setReports(
        await request<ModerationReport[]>(
          `/admin/reports?status=${status}`,
          { cache: "reload" },
        ),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    void request<ModerationReport[]>(`/admin/reports?status=${status}`)
      .then((nextReports) => {
        if (!cancelled) setReports(nextReports);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Could not load reports");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    void request<typeof appeals>("/admin/moderation/appeals?status=PENDING")
      .then(setAppeals)
      .catch(() => undefined);
  }, []);

  async function run(reportId: string, action: () => Promise<unknown>) {
    try {
      setWorkingId(reportId);
      setError("");
      await action();
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Moderation action failed");
    } finally {
      setWorkingId(null);
    }
  }

  function dismiss(report: ModerationReport) {
    return run(report.id, () =>
      request(`/admin/reports/${report.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DISMISSED", resolutionNote: "No violation found" }),
      }),
    );
  }

  async function removeContent(report: ModerationReport) {
    const target = report.post
      ? `/admin/moderation/posts/${report.post.id}`
      : report.comment
        ? `/admin/moderation/comments/${report.comment.id}`
        : null;
    if (!target || !(await confirmAction({
      title: "Remove this content permanently?",
      message: "This action cannot be undone.",
      confirmLabel: "Remove content",
      tone: "destructive",
    }))) return;
    return run(report.id, () => request(target, { method: "DELETE" }));
  }

  async function toggleSuspension(report: ModerationReport) {
    if (!report.reportedUser) return;
    const suspended = !report.reportedUser.isSuspended;
    const verb = suspended ? "suspend" : "restore";
    if (!(await confirmAction({
      title: `${verb[0]?.toUpperCase()}${verb.slice(1)} ${report.reportedUser.username}?`,
      message: suspended
        ? "They will lose access until an admin restores the account."
        : "Their access to FindEat will be restored.",
      confirmLabel: suspended ? "Suspend user" : "Restore user",
      tone: suspended ? "warning" : "default",
    }))) return;
    return run(report.id, () =>
      request(`/admin/moderation/users/${report.reportedUser!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ suspended }),
      }),
    );
  }

  return (
    <div className="moderation-panel">
      <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]">
        <div>
          <p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">TRUST &amp; SAFETY</p>
          <h2>Reported content</h2>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">Review reports and take action on content or accounts that break the community guidelines.</p>
        </div>
        <button className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)] compact [.dish-food-tags&_.dish-food-tags-heading]:[padding:13px_14px] [.dish-food-tags&_.dish-tag-group_summary]:[padding:11px_14px] [.dish-food-tags&_.dish-tag-options]:[padding-right:14px] [.dish-food-tags&_.dish-tag-options]:[padding-left:14px] [.admin-monitor-metrics&]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [.dish-tags&]:[display:inline-flex] [.dish-tags&]:[flex-direction:row] [.dish-tags&]:[align-items:center] [.dish-tags&]:[gap:6px] [.dish-tags&]:[width:auto] [.dish-tags&]:[max-width:190px] [.dish-tags&]:[min-width:0] [.dish-tags&]:[white-space:nowrap] [.dish-tags&_span]:[display:block] [.dish-tags&_span]:[flex:0_1_auto] [.dish-tags&_span]:[max-width:112px] [.dish-tags&_span]:[overflow:hidden] [.dish-tags&_span]:[text-overflow:ellipsis] [.dish-tags&_span]:[white-space:nowrap] [.dish-tags&_small]:[white-space:nowrap]" onClick={() => void load()}>Refresh</button>
      </div>

      {appeals.length > 0 ? (
        <section className="moderation-list [display:grid] [gap:15px] [padding-bottom:30px]">
          <div className="page-heading [display:flex] [align-items:flex-end] [justify-content:space-between] [gap:24px] [margin-bottom:30px] [&_.eyebrow]:[margin-top:0] [&_h2]:[margin-bottom:8px] [&_h2]:[font-size:36px] [&_h2]:[letter-spacing:-0.035em] [&_p]:[margin-bottom:0] [.performance-page_&_select]:[min-width:130px] [.performance-page_&_select]:[padding:10px_12px] [.performance-page_&_select]:[border:1px_solid_var(--line)] [.performance-page_&_select]:[border-radius:11px] [.performance-page_&_select]:[background:var(--surface)] [.performance-page_&_select]:[color:var(--ink)] [.pro-page>&]:[margin-bottom:12px] max-[800px]:[align-items:flex-start] max-[800px]:[flex-direction:column] max-[800px]:[gap:14px] max-[800px]:[margin-bottom:22px] max-[800px]:[&_h2]:[font-size:clamp(28px,_8vw,_34px)] max-[800px]:[&_h2]:[line-height:1.08] max-[800px]:[&_p]:[max-width:68ch] max-[800px]:[&_p]:[line-height:1.5] max-[800px]:[&>div]:[min-width:0] [.restaurant-badges-page_&]:[display:flex] [.restaurant-badges-page_&]:[align-items:flex-start] [.restaurant-badges-page_&]:[justify-content:space-between] [.restaurant-badges-page_&]:[gap:24px] [.restaurant-badges-page_&]:[margin-bottom:28px] max-[700px]:[.restaurant-badges-page_&]:[flex-direction:column]"><div><p className="eyebrow [color:var(--accent)] [font-size:12px] [font-weight:800] [letter-spacing:0.12em] [margin:20px_0_8px] [.error-page-copy_&]:[margin:0_0_14px] [.error-page-copy>p:not(&)]:[max-width:570px] [.error-page-copy>p:not(&)]:[margin-bottom:0] [.error-page-copy>p:not(&)]:[color:var(--muted)] [.error-page-copy>p:not(&)]:[font-size:clamp(16px,_2vw,_19px)] [.error-page-copy>p:not(&)]:[line-height:1.65] max-[760px]:[.error-page-copy>p:not(&)]:[margin-inline:auto] [.legal-hero_&]:[margin-top:0] [.legal-hero>p:not(&):not(.legal-effective)]:[color:#625d56] [.legal-hero>p:not(&):not(.legal-effective)]:[font-size:16px] [.legal-hero>p:not(&):not(.legal-effective)]:[line-height:1.75] [.deletion-hero_&]:[margin-top:0] [.admin-monitor-card-heading_&]:[margin:0_0_5px] [.premium-title_&]:[margin-bottom:8px] max-[650px]:[.messages-heading_&]:[display:none] dark:[.legal-hero>p:not(&):not(.legal-effective)]:[color:#bcb5ac] [.restaurant-badges-page_&]:[color:#ff7255] [.restaurant-badges-page_&]:[font-size:12px] [.restaurant-badges-page_&]:[font-weight:800] [.restaurant-badges-page_&]:[letter-spacing:0.14em] [.restaurant-badges-page_&]:[text-transform:uppercase]">APPEALS</p><h2>Pending appeals</h2></div></div>
          {appeals.map((appeal) => (
            <article className="moderation-card [padding:19px] [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [box-shadow:0_5px_18px_#39251308] dark:[box-shadow:0_8px_28px_#0003]" key={appeal.id}>
              <div className="moderation-reason [display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [margin-top:13px] [&_small]:[color:var(--muted)] max-[600px]:[align-items:flex-start] max-[600px]:[flex-direction:column]"><strong>{appeal.action.action.toLowerCase().replaceAll("_", " ")}</strong></div>
              <p className="moderation-details [margin:12px_0_0] [padding:11px_13px] [border-left:3px_solid_#e5b05f] [background:#fffaf2] [color:#625748] [font-size:12px] dark:[background:#2b241b] dark:[color:#d0c2ae]">“{appeal.reason}”</p>
              <UserIdentity user={appeal.user} />
              <div className="moderation-actions [display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [justify-content:flex-end] [margin-top:16px] [&_button]:[display:flex] [&_button]:[align-items:center] [&_button]:[gap:6px] [&_.danger]:[border:0] [&_.danger]:[border-radius:11px] [&_.danger]:[background:#fff0ed] [&_.danger]:[color:#b33c2b] [&_.danger]:[font-weight:800] max-[800px]:[align-items:stretch] max-[800px]:[flex-direction:column] max-[800px]:[&_button]:[justify-content:center] max-[800px]:[&_button]:[width:100%] [&_.danger]:[background:var(--danger-soft)] [&_.danger]:[color:var(--danger)]">
                <button className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]" onClick={() => void request(`/admin/moderation/appeals/${appeal.id}`, { method: "PATCH", body: JSON.stringify({ status: "REJECTED", resolutionNote: "Original decision upheld" }) }).then(() => setAppeals((items) => items.filter((item) => item.id !== appeal.id)))}>Reject</button>
                <button onClick={() => void request(`/admin/moderation/appeals/${appeal.id}`, { method: "PATCH", body: JSON.stringify({ status: "APPROVED", resolutionNote: "Decision reversed after appeal" }) }).then(() => setAppeals((items) => items.filter((item) => item.id !== appeal.id)))}>Approve &amp; restore</button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <div className="moderation-filters [display:flex] [gap:8px] [margin:18px_0_22px] [&_button]:[padding:9px_14px] [&_button]:[border:1px_solid_var(--line)] [&_button]:[border-radius:999px] [&_button]:[background:var(--surface)] [&_button]:[color:var(--muted)] [&_button]:[font-size:11px] [&_button]:[font-weight:800] [&_button]:[text-transform:capitalize] [&_button]:[transition:background-color_.18s_ease,border-color_.18s_ease,color_.18s_ease] [&_button:hover]:[border-color:color-mix(in_srgb,var(--ink)_24%,var(--line))] [&_button:hover]:[background:var(--surface-hover)] [&_button:hover]:[color:var(--ink)] [&_button.active]:[border-color:var(--accent)] [&_button.active]:[background:var(--accent)] [&_button.active]:[color:#171717] [&_button.active:hover]:[border-color:var(--accent)] [&_button.active:hover]:[background:var(--accent)] [&_button.active:hover]:[color:#171717]">
        {(["PENDING", "AWAITING_AUTHOR", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as ReportStatus[]).map((item) => (
          <button type="button" key={item} aria-pressed={status === item} className={status === item ? "active" : ""} onClick={() => {
            setLoading(true);
            setStatus(item);
          }}>
            {item.toLowerCase()}
          </button>
        ))}
      </div>

      {error ? <p className="error [color:#b32727] [font-size:13px] [color:var(--danger)] banner [padding:12px_16px] [border-radius:12px] [background:#fff0f0] [.support-admin-content>&]:[flex:0_0_auto] [.support-admin-content>.admin-support-slot>&]:[flex:0_0_auto] [background:var(--danger-soft)] [color:var(--danger)]">{error}</p> : null}
      {loading ? (
        <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="empty [padding:65px_20px] [border:1px_dashed_#d8d5cf] [border-radius:20px] [text-align:center] [color:var(--muted)] [&_span]:[font-size:35px] [&_h3]:[color:var(--ink)] [&_h3]:[margin:12px_0_6px]">
          <CheckCircleIcon size={32} weight="duotone" />
          <h3>No {status.toLowerCase()} reports</h3>
          <p>The moderation queue is clear.</p>
        </div>
      ) : (
        <div className="moderation-list [display:grid] [gap:15px] [padding-bottom:30px]">
          {reports.map((report) => {
            const previewImage = report.post?.contentPost?.imageUrl ?? report.post?.reviewPost?.coverImageUrl;
            const previewText = report.comment?.content ?? report.post?.contentPost?.caption ?? report.post?.reviewPost?.summary ?? report.restaurant?.name;
            return (
              <article className="moderation-card [padding:19px] [border:1px_solid_var(--line)] [border-radius:18px] [background:var(--surface)] [box-shadow:0_5px_18px_#39251308] dark:[box-shadow:0_8px_28px_#0003]" key={report.id}>
                <div className="moderation-card-head [display:flex] [align-items:center] [justify-content:space-between] [gap:10px] max-[600px]:[align-items:flex-start] max-[600px]:[flex-direction:column]">
                  <span className="moderation-target [display:flex] [align-items:center] [gap:6px] [width:max-content] [padding:5px_9px] [border:1px_solid_var(--danger-border)] [border-radius:999px] [background:var(--danger-soft)] [color:var(--danger)] [font-size:10px] [font-weight:900] [text-transform:uppercase]"><FlagIcon size={16} weight="fill" /> {report.targetType.toLowerCase()}</span>
                  <span className={`report-status [padding:5px_9px] [border:1px_solid_var(--warning-border)] [border-radius:999px] [background:var(--warning-soft)] [color:var(--warning)] [font-size:9px] [font-weight:900] [text-transform:uppercase] [&.resolved]:[border-color:var(--success-border)] [&.resolved]:[background:var(--success-soft)] [&.resolved]:[color:var(--success)] [&.dismissed]:[border-color:var(--line)] [&.dismissed]:[background:var(--neutral-chip)] [&.dismissed]:[color:var(--neutral-chip-text)] ${report.status.toLowerCase()}`}>{report.status.toLowerCase()}</span>
                </div>
                <div className="moderation-reason [display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [margin-top:13px] [&_small]:[color:var(--muted)] max-[600px]:[align-items:flex-start] max-[600px]:[flex-direction:column]">
                  <strong>{reasonLabels[report.reason]}</strong>
                  <small>{new Date(report.createdAt).toLocaleString()}</small>
                </div>
                {previewImage || previewText ? (
                  <div className="moderation-preview [display:grid] [grid-template-columns:auto_minmax(0,1fr)] [align-items:center] [gap:12px] [margin-top:14px] [padding:11px] [border-radius:13px] [background:var(--soft)] [&_img]:[width:62px] [&_img]:[height:62px] [&_img]:[border-radius:10px] [&_img]:[object-fit:cover] [&_p]:[margin:0] [&_p]:[line-height:1.45] max-[600px]:[grid-template-columns:52px_minmax(0,1fr)] max-[600px]:[&_img]:[width:52px] max-[600px]:[&_img]:[height:52px]">
                    {previewImage ? <img src={previewImage} alt="Reported content" /> : null}
                    <p>{previewText || "Media post"}</p>
                  </div>
                ) : null}
                {report.details ? <p className="moderation-details [margin:12px_0_0] [padding:11px_13px] [border-left:3px_solid_#e5b05f] [background:#fffaf2] [color:#625748] [font-size:12px] dark:[background:#2b241b] dark:[color:#d0c2ae]">“{report.details}”</p> : null}
                {report.reportingRestaurant ? (
                  <div className="moderation-people [display:grid] [grid-template-columns:1fr_1fr] [gap:18px] [margin-top:16px] [padding-top:15px] [border-top:1px_solid_var(--line)] [&>div>span]:[display:block] [&>div>span]:[margin-bottom:8px] [&>div>span]:[color:var(--muted)] [&>div>span]:[font-size:9px] [&>div>span]:[font-weight:900] [&>div>span]:[text-transform:uppercase] max-[800px]:[grid-template-columns:1fr]">
                    <div><span>Disputed by restaurant</span><strong>{report.reportingRestaurant.name}</strong></div>
                    <div><span>Author response</span><strong>{report.authorResponse?.toLowerCase().replaceAll("_", " ") ?? "Waiting for author"}</strong></div>
                  </div>
                ) : null}
                <div className="moderation-people [display:grid] [grid-template-columns:1fr_1fr] [gap:18px] [margin-top:16px] [padding-top:15px] [border-top:1px_solid_var(--line)] [&>div>span]:[display:block] [&>div>span]:[margin-bottom:8px] [&>div>span]:[color:var(--muted)] [&>div>span]:[font-size:9px] [&>div>span]:[font-weight:900] [&>div>span]:[text-transform:uppercase] max-[800px]:[grid-template-columns:1fr]">
                  <div><span>Reported by</span><UserIdentity user={report.reporter} /></div>
                  {report.reportedUser ? <div><span>Reported account</span><UserIdentity user={report.reportedUser} /></div> : null}
                </div>
                {report.status === "PENDING" ? (
                  <div className="moderation-actions [display:flex] [align-items:center] [justify-content:space-between] [gap:10px] [justify-content:flex-end] [margin-top:16px] [&_button]:[display:flex] [&_button]:[align-items:center] [&_button]:[gap:6px] [&_.danger]:[border:0] [&_.danger]:[border-radius:11px] [&_.danger]:[background:#fff0ed] [&_.danger]:[color:#b33c2b] [&_.danger]:[font-weight:800] max-[800px]:[align-items:stretch] max-[800px]:[flex-direction:column] max-[800px]:[&_button]:[justify-content:center] max-[800px]:[&_button]:[width:100%] [&_.danger]:[background:var(--danger-soft)] [&_.danger]:[color:var(--danger)]">
                    <button disabled={workingId === report.id} className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]" onClick={() => void dismiss(report)}>Dismiss</button>
                    {(report.post || report.comment) ? (
                      <button disabled={workingId === report.id} className="danger [color:#b54635] [.moderation-actions_&]:[border:0] [.moderation-actions_&]:[border-radius:11px] [.moderation-actions_&]:[background:#fff0ed] [.moderation-actions_&]:[color:#b33c2b] [.moderation-actions_&]:[font-weight:800] [.icon-button&]:[color:#b32727] [color:var(--danger)] [.icon-button&]:[color:var(--danger)] [.moderation-actions_&]:[background:var(--danger-soft)] [.moderation-actions_&]:[color:var(--danger)]" onClick={() => void removeContent(report)}>
                        <TrashIcon size={16} weight="bold" /> Remove content
                      </button>
                    ) : null}
                    {report.post && report.reason === "WRONG_RESTAURANT" ? (
                      <button
                        disabled={workingId === report.id}
                        className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]"
                        onClick={async () => {
                          const restaurantId = await promptAction({
                            title: "Correct restaurant association",
                            message: "Enter the new restaurant ID, or leave it empty to remove the association.",
                            placeholder: "Restaurant ID",
                            confirmLabel: "Update restaurant",
                          });
                          if (restaurantId === null) return;
                          void run(report.id, () => request(`/admin/moderation/posts/${report.post!.id}/restaurant`, {
                            method: "PATCH",
                            body: JSON.stringify({ restaurantId: restaurantId.trim() || undefined }),
                          }));
                        }}
                      >Correct restaurant</button>
                    ) : null}
                    {report.reportedUser ? (
                      <button disabled={workingId === report.id} className={report.reportedUser.isSuspended ? "secondary" : "danger"} onClick={() => void toggleSuspension(report)}>
                        <ProhibitIcon size={16} weight="bold" /> {report.reportedUser.isSuspended ? "Restore account" : "Suspend account"}
                      </button>
                    ) : null}
                  </div>
                ) : report.resolutionNote ? <p className="moderation-resolution [margin:14px_0_0] [color:var(--green)] [font-size:11px] [font-weight:800]">Resolution: {report.resolutionNote}</p> : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
