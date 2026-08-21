import { CheckCircleIcon, UsersThreeIcon, WrenchIcon } from "@phosphor-icons/react";
import type { KnownIssue } from "@findeat/types";
import { KnownIssueStatusBadge } from "./KnownIssueStatusBadge";

function readableDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

const severityTone = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-200",
  LOW: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
};

export function KnownIssueCard({ issue, compact = false }: { issue: KnownIssue; compact?: boolean }) {
  return (
    <article className={`rounded-[22px] border border-line bg-surface shadow-panel ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <KnownIssueStatusBadge status={issue.status} />
            {issue.severity ? (
              <span className={`rounded-full px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[.06em] ${severityTone[issue.severity]}`}>
                {issue.severity.toLowerCase()}
              </span>
            ) : null}
          </div>
          <h3 className="m-0 mt-3 text-lg font-black leading-tight tracking-[-.02em] text-ink sm:text-xl">
            {issue.title}
          </h3>
          {issue.description ? (
            <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-muted">{issue.description}</p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-soft px-3 py-2 text-xs font-extrabold text-muted">
          <UsersThreeIcon size={16} weight="duotone" />
          {issue.affectedCount} affected
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {issue.platforms.map((platform) => (
          <span key={platform} className="rounded-full border border-line bg-surface-subtle px-2.5 py-1.5 text-[11px] font-bold text-ink">
            {platform}
          </span>
        ))}
        {issue.affectedAreas.map((area) => (
          <span key={area} className="rounded-full bg-accent-soft px-2.5 py-1.5 text-[11px] font-bold text-accent">
            {area}
          </span>
        ))}
      </div>

      {issue.workaround ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-soft p-4">
          <WrenchIcon className="mt-0.5 shrink-0 text-accent" size={19} weight="duotone" />
          <div>
            <strong className="text-xs text-ink">Temporary workaround</strong>
            <p className="m-0 mt-1 text-sm leading-5 text-muted">{issue.workaround}</p>
          </div>
        </div>
      ) : null}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-[11px] font-semibold text-muted">
        <span>Reported {readableDate(issue.reportedAt)}</span>
        {issue.status === "RESOLVED" ? (
          <span className="inline-flex items-center gap-1.5 font-extrabold text-success">
            <CheckCircleIcon size={16} weight="fill" />
            {issue.fixedInVersion ? `Resolved in version ${issue.fixedInVersion}` : "Resolved"}
          </span>
        ) : issue.fixedInVersion ? (
          <span className="font-extrabold text-purple">Planned for {issue.fixedInVersion}</span>
        ) : null}
      </footer>
    </article>
  );
}
