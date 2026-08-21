import { SparkleIcon } from "@phosphor-icons/react";
import type { KnownIssue } from "@findeat/types";
import { KnownIssueCard } from "./KnownIssueCard";

export function KnownIssuesList({ issues, empty }: { issues: KnownIssue[]; empty?: boolean }) {
  if (!issues.length && empty) {
    return (
      <div className="rounded-[24px] border border-dashed border-line bg-surface p-9 text-center">
        <SparkleIcon className="mx-auto text-accent" size={32} weight="duotone" />
        <h3 className="m-0 mt-3 text-xl font-black text-ink">All clear ✨</h3>
        <p className="m-0 mt-2 text-sm text-muted">There are currently no known active issues.</p>
      </div>
    );
  }
  return <div className="grid gap-4">{issues.map((issue) => <KnownIssueCard key={issue.id} issue={issue} />)}</div>;
}
