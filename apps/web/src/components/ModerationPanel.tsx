import { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
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

const reportStatuses: ReportStatus[] = [
  "PENDING",
  "AWAITING_AUTHOR",
  "UNDER_REVIEW",
  "RESOLVED",
  "DISMISSED",
];

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = `${buttonBase} border-line bg-surface text-ink hover:bg-surface-hover`;
const primaryButton = `${buttonBase} border-accent bg-accent text-[#171717] hover:brightness-95`;
const dangerButton = `${buttonBase} border-danger-border bg-danger-soft text-danger hover:brightness-95`;

type ModerationAppeal = {
  id: string;
  reason: string;
  status: string;
  user: {
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  action: { action: string; reason: string; post?: { id: string } | null };
};

export function ModerationPanel() {
  const [status, setStatus] = useState<ReportStatus>("PENDING");
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);

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

  const loadAppeals = useCallback(async () => {
    try {
      setAppeals(
        await request<ModerationAppeal[]>(
          "/admin/moderation/appeals?status=PENDING",
          { cache: "reload" },
        ),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not load appeals",
      );
    }
  }, []);

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
    void request<ModerationAppeal[]>(
      "/admin/moderation/appeals?status=PENDING",
    )
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
    const postId = report.post?.id ?? report.postId;
    const commentId = report.comment?.id ?? report.commentId;
    const snapId = report.snap?.id ?? report.snapId;
    const target =
      report.targetType === "POST" && postId
        ? `/admin/moderation/posts/${postId}`
        : report.targetType === "COMMENT" && commentId
          ? `/admin/moderation/comments/${commentId}`
          : report.targetType === "SNAP" && snapId
            ? `/admin/moderation/snaps/${snapId}`
            : null;
    const targetLabel = report.targetType.toLowerCase();
    if (!target || !(await confirmAction({
      title: `Remove this ${targetLabel}?`,
      message:
        "The author will be notified, shown the reason, and given the option to appeal.",
      confirmLabel: `Remove ${targetLabel}`,
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

  async function reviewAppeal(
    appealId: string,
    appealStatus: "APPROVED" | "REJECTED",
  ) {
    const workKey = `appeal:${appealId}`;
    try {
      setWorkingId(workKey);
      setError("");
      await request(`/admin/moderation/appeals/${appealId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: appealStatus,
          resolutionNote:
            appealStatus === "APPROVED"
              ? "Decision reversed after appeal"
              : "Original decision upheld",
        }),
      });
      setAppeals((items) => items.filter((item) => item.id !== appealId));
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not review appeal",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="moderation-panel min-w-0 pb-8">
      <header className="mb-7 flex items-end justify-between gap-5 max-[700px]:items-start max-[700px]:flex-col">
        <div className="min-w-0">
          <p className="m-0 mb-2 text-xs font-black tracking-[0.14em] text-accent">
            TRUST &amp; SAFETY
          </p>
          <h2 className="m-0 text-4xl font-black tracking-[-0.04em] text-ink max-[700px]:text-3xl">
            Moderation queue
          </h2>
          <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-muted">
            Review reports, protect the community, and keep every decision easy
            to understand.
          </p>
        </div>
        <button
          type="button"
          className={`${secondaryButton} shrink-0 max-[700px]:w-full`}
          disabled={loading}
          onClick={() => void Promise.all([load(), loadAppeals()])}
        >
          <ArrowClockwiseIcon
            className={loading ? "animate-spin" : ""}
            size={17}
            weight="bold"
          />
          Refresh
        </button>
      </header>

      {error ? (
        <p className="mb-5 rounded-2xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </p>
      ) : null}

      {appeals.length > 0 ? (
        <section className="mb-8 rounded-[24px] border border-warning-border bg-warning-soft/45 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[11px] font-black tracking-[0.13em] text-warning">
                NEEDS A DECISION
              </p>
              <h3 className="m-0 mt-1 text-xl font-black text-ink">
                Pending appeals
              </h3>
            </div>
            <span className="grid min-w-9 place-items-center rounded-full bg-warning px-2.5 py-1.5 text-xs font-black text-white">
              {appeals.length}
            </span>
          </div>
          <div className="grid gap-3">
            {appeals.map((appeal) => {
              const appealWorkKey = `appeal:${appeal.id}`;
              return (
                <article
                  className="rounded-[20px] border border-line bg-surface p-4 shadow-[0_8px_24px_color-mix(in_srgb,var(--ink)_6%,transparent)] sm:p-5"
                  key={appeal.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-warning-border bg-warning-soft px-3 py-1 text-[10px] font-black uppercase tracking-wide text-warning">
                      {appeal.action.action.toLowerCase().replaceAll("_", " ")}
                    </span>
                    <UserIdentity user={appeal.user} />
                  </div>
                  <div className="mt-4 rounded-2xl border border-line bg-soft px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                      User’s appeal
                    </span>
                    <p className="m-0 mt-1 text-sm leading-6 text-ink">
                      “{appeal.reason}”
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2 max-[600px]:grid max-[600px]:grid-cols-1">
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={workingId === appealWorkKey}
                      onClick={() => void reviewAppeal(appeal.id, "REJECTED")}
                    >
                      Reject appeal
                    </button>
                    <button
                      type="button"
                      className={primaryButton}
                      disabled={workingId === appealWorkKey}
                      onClick={() => void reviewAppeal(appeal.id, "APPROVED")}
                    >
                      <CheckCircleIcon size={17} weight="bold" />
                      Approve &amp; restore
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mb-5 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2 rounded-2xl border border-line bg-soft p-1.5">
          {reportStatuses.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={status === item}
              className={`min-h-10 rounded-xl border px-4 py-2 text-xs font-black capitalize transition ${
                status === item
                  ? "border-accent bg-accent text-[#171717] shadow-sm"
                  : "border-transparent bg-transparent text-muted hover:bg-surface hover:text-ink"
              }`}
              onClick={() => {
                if (item === status) return;
                setLoading(true);
                setStatus(item);
              }}
            >
              {item.toLowerCase().replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-[24px] border border-dashed border-line bg-surface text-sm font-bold text-muted">
          Loading reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-[24px] border border-dashed border-line bg-surface p-8 text-center">
          <div>
            <CheckCircleIcon
              className="mx-auto text-success"
              size={38}
              weight="duotone"
            />
            <h3 className="m-0 mt-3 text-lg font-black text-ink">
              No {status.toLowerCase().replaceAll("_", " ")} reports
            </h3>
            <p className="m-0 mt-1 text-sm text-muted">
              This part of the moderation queue is clear.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => {
            const previewImage =
              report.snap?.imageUrl ??
              report.post?.contentPost?.imageUrl ??
              report.post?.reviewPost?.coverImageUrl;
            const previewText =
              report.snap?.caption ??
              report.comment?.content ??
              report.post?.contentPost?.caption ??
              report.post?.reviewPost?.summary ??
              report.restaurant?.name;
            const isWorking = workingId === report.id;

            return (
              <article
                className="overflow-hidden rounded-[24px] border border-line bg-surface shadow-[0_10px_30px_color-mix(in_srgb,var(--ink)_6%,transparent)]"
                key={report.id}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-danger-border bg-danger-soft px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-danger">
                      <FlagIcon size={14} weight="fill" />
                      {report.targetType.toLowerCase()}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                        report.status === "RESOLVED"
                          ? "border-success-border bg-success-soft text-success"
                          : report.status === "DISMISSED"
                            ? "border-line bg-neutral-chip text-neutral-chip-text"
                            : "border-warning-border bg-warning-soft text-warning"
                      }`}
                    >
                      {report.status.toLowerCase().replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-4 max-[600px]:flex-col max-[600px]:gap-1">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                        Report reason
                      </span>
                      <h3 className="m-0 mt-1 text-lg font-black text-ink">
                        {reasonLabels[report.reason]}
                      </h3>
                    </div>
                    <time className="shrink-0 text-xs font-semibold text-muted">
                      {new Date(report.createdAt).toLocaleString()}
                    </time>
                  </div>

                  {previewImage || previewText ? (
                    <div className="mt-4 grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-line bg-soft p-3 max-[520px]:grid-cols-[56px_minmax(0,1fr)]">
                      {previewImage ? (
                        <img
                          className="size-[72px] rounded-xl object-cover max-[520px]:size-14"
                          src={previewImage}
                          alt="Reported content"
                        />
                      ) : (
                        <span className="grid size-[72px] place-items-center rounded-xl bg-surface text-muted max-[520px]:size-14">
                          <FlagIcon size={22} weight="duotone" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                          Reported {report.targetType.toLowerCase()}
                        </span>
                        <p className="m-0 mt-1 line-clamp-3 text-sm leading-5 text-ink">
                          {previewText || "Media post"}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {report.details ? (
                    <div className="mt-3 rounded-2xl border border-warning-border bg-warning-soft px-4 py-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-warning">
                        Additional details
                      </span>
                      <p className="m-0 mt-1 text-sm leading-5 text-ink">
                        “{report.details}”
                      </p>
                    </div>
                  ) : null}

                  {report.reportingRestaurant ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 max-[650px]:grid-cols-1">
                      <div className="rounded-2xl border border-line p-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                          Disputed by restaurant
                        </span>
                        <strong className="mt-1 block text-sm text-ink">
                          {report.reportingRestaurant.name}
                        </strong>
                      </div>
                      <div className="rounded-2xl border border-line p-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                          Author response
                        </span>
                        <strong className="mt-1 block text-sm capitalize text-ink">
                          {report.authorResponse
                            ?.toLowerCase()
                            .replaceAll("_", " ") ?? "Waiting for author"}
                        </strong>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 max-[650px]:grid-cols-1">
                    <div className="min-w-0 rounded-2xl bg-soft p-3">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-muted">
                        Reported by
                      </span>
                      <UserIdentity user={report.reporter} />
                    </div>
                    {report.reportedUser ? (
                      <div className="min-w-0 rounded-2xl bg-soft p-3">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-muted">
                          Reported account
                        </span>
                        <UserIdentity user={report.reportedUser} />
                      </div>
                    ) : null}
                  </div>
                </div>

                {report.status === "PENDING" ? (
                  <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-soft/60 p-4 max-[650px]:grid max-[650px]:grid-cols-1">
                    <button
                      type="button"
                      disabled={isWorking}
                      className={secondaryButton}
                      onClick={() => void dismiss(report)}
                    >
                      <CheckCircleIcon size={17} weight="bold" />
                      Dismiss report
                    </button>
                    {report.post && report.reason === "WRONG_RESTAURANT" ? (
                      <button
                        type="button"
                        disabled={isWorking}
                        className={secondaryButton}
                        onClick={async () => {
                          const restaurantId = await promptAction({
                            title: "Correct restaurant association",
                            message:
                              "Enter the new restaurant ID, or leave it empty to remove the association.",
                            placeholder: "Restaurant ID",
                            confirmLabel: "Update restaurant",
                          });
                          if (restaurantId === null) return;
                          void run(report.id, () =>
                            request(
                              `/admin/moderation/posts/${report.post!.id}/restaurant`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  restaurantId:
                                    restaurantId.trim() || undefined,
                                }),
                              },
                            ),
                          );
                        }}
                      >
                        Correct restaurant
                      </button>
                    ) : null}
                    {report.reportedUser ? (
                      <button
                        type="button"
                        disabled={isWorking}
                        className={
                          report.reportedUser.isSuspended
                            ? secondaryButton
                            : dangerButton
                        }
                        onClick={() => void toggleSuspension(report)}
                      >
                        <ProhibitIcon size={17} weight="bold" />
                        {report.reportedUser.isSuspended
                          ? "Restore account"
                          : "Suspend account"}
                      </button>
                    ) : null}
                    {["POST", "COMMENT", "SNAP"].includes(
                      report.targetType,
                    ) ? (
                      <button
                        type="button"
                        disabled={isWorking}
                        className={dangerButton}
                        onClick={() => void removeContent(report)}
                      >
                        <TrashIcon size={17} weight="bold" />
                        Remove {report.targetType.toLowerCase()}
                      </button>
                    ) : null}
                  </div>
                ) : report.resolutionNote ? (
                  <div className="border-t border-success-border bg-success-soft px-4 py-3 text-sm font-bold text-success">
                    Resolution: {report.resolutionNote}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
