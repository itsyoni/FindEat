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

const reasonLabels: Record<ModerationReport["reason"], string> = {
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

  function removeContent(report: ModerationReport) {
    const target = report.post
      ? `/admin/moderation/posts/${report.post.id}`
      : report.comment
        ? `/admin/moderation/comments/${report.comment.id}`
        : null;
    if (!target || !window.confirm("Remove this content permanently?")) return;
    return run(report.id, () => request(target, { method: "DELETE" }));
  }

  function toggleSuspension(report: ModerationReport) {
    if (!report.reportedUser) return;
    const suspended = !report.reportedUser.isSuspended;
    const verb = suspended ? "suspend" : "restore";
    if (!window.confirm(`${verb[0]?.toUpperCase()}${verb.slice(1)} @${report.reportedUser.username}?`)) return;
    return run(report.id, () =>
      request(`/admin/moderation/users/${report.reportedUser!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ suspended }),
      }),
    );
  }

  return (
    <div className="moderation-panel">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TRUST &amp; SAFETY</p>
          <h2>Reported content</h2>
          <p className="muted">Review reports and take action on content or accounts that break the community guidelines.</p>
        </div>
        <button className="secondary compact" onClick={() => void load()}>Refresh</button>
      </div>

      <div className="moderation-filters">
        {(["PENDING", "RESOLVED", "DISMISSED"] as ReportStatus[]).map((item) => (
          <button type="button" key={item} aria-pressed={status === item} className={status === item ? "active" : ""} onClick={() => {
            setLoading(true);
            setStatus(item);
          }}>
            {item.toLowerCase()}
          </button>
        ))}
      </div>

      {error ? <p className="error banner">{error}</p> : null}
      {loading ? (
        <div className="empty">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="empty">
          <CheckCircleIcon size={32} weight="duotone" />
          <h3>No {status.toLowerCase()} reports</h3>
          <p>The moderation queue is clear.</p>
        </div>
      ) : (
        <div className="moderation-list">
          {reports.map((report) => {
            const previewImage = report.post?.contentPost?.imageUrl ?? report.post?.reviewPost?.coverImageUrl;
            const previewText = report.comment?.content ?? report.post?.contentPost?.description ?? report.post?.reviewPost?.summary ?? report.restaurant?.name;
            return (
              <article className="moderation-card" key={report.id}>
                <div className="moderation-card-head">
                  <span className="moderation-target"><FlagIcon size={16} weight="fill" /> {report.targetType.toLowerCase()}</span>
                  <span className={`report-status ${report.status.toLowerCase()}`}>{report.status.toLowerCase()}</span>
                </div>
                <div className="moderation-reason">
                  <strong>{reasonLabels[report.reason]}</strong>
                  <small>{new Date(report.createdAt).toLocaleString()}</small>
                </div>
                {previewImage || previewText ? (
                  <div className="moderation-preview">
                    {previewImage ? <img src={previewImage} alt="Reported content" /> : null}
                    <p>{previewText || "Media post"}</p>
                  </div>
                ) : null}
                {report.details ? <p className="moderation-details">“{report.details}”</p> : null}
                <div className="moderation-people">
                  <div><span>Reported by</span><UserIdentity user={report.reporter} /></div>
                  {report.reportedUser ? <div><span>Reported account</span><UserIdentity user={report.reportedUser} /></div> : null}
                </div>
                {report.status === "PENDING" ? (
                  <div className="moderation-actions">
                    <button disabled={workingId === report.id} className="secondary" onClick={() => void dismiss(report)}>Dismiss</button>
                    {(report.post || report.comment) ? (
                      <button disabled={workingId === report.id} className="danger" onClick={() => void removeContent(report)}>
                        <TrashIcon size={16} weight="bold" /> Remove content
                      </button>
                    ) : null}
                    {report.reportedUser ? (
                      <button disabled={workingId === report.id} className={report.reportedUser.isSuspended ? "secondary" : "danger"} onClick={() => void toggleSuspension(report)}>
                        <ProhibitIcon size={16} weight="bold" /> {report.reportedUser.isSuspended ? "Restore account" : "Suspend account"}
                      </button>
                    ) : null}
                  </div>
                ) : report.resolutionNote ? <p className="moderation-resolution">Resolution: {report.resolutionNote}</p> : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
