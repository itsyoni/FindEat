import type { KnownIssueStatus } from "@findeat/types";

const knownIssueStatusLabel: Record<KnownIssueStatus, string> = {
  INVESTIGATING: "Investigating",
  IN_PROGRESS: "Fix in progress",
  FIXED_NEXT_RELEASE: "Fixed in next update",
  RESOLVED: "Resolved",
};

const tone: Record<KnownIssueStatus, string> = {
  INVESTIGATING: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
  FIXED_NEXT_RELEASE: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
};

export function KnownIssueStatusBadge({ status }: { status: KnownIssueStatus }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-extrabold ${tone[status]}`}>
      {knownIssueStatusLabel[status]}
    </span>
  );
}
