import { useCallback, useEffect, useState } from "react";
import type {
  AdminKnownIssue,
  KnownIssueInput,
  KnownIssueSeverity,
  KnownIssueStatus,
} from "@findeat/types";
import { BugIcon, PlusIcon } from "@phosphor-icons/react";
import { CustomDropdown } from "./CustomDropdown";
import { KnownIssueStatusBadge } from "./known-issues/KnownIssueStatusBadge";
import { request } from "../lib/api";

type Draft = Omit<KnownIssueInput, "platforms" | "affectedAreas"> & {
  platforms: string;
  affectedAreas: string;
};

const blankDraft = (): Draft => ({
  title: "",
  description: "",
  workaround: "",
  status: "INVESTIGATING",
  severity: "MEDIUM",
  platforms: "iOS, Android",
  affectedAreas: "",
  reportedAt: new Date().toISOString().slice(0, 10),
  fixedInVersion: "",
  isPublic: true,
  internalNotes: "",
});

function issueDraft(issue: AdminKnownIssue): Draft {
  return {
    title: issue.title,
    description: issue.description ?? "",
    workaround: issue.workaround ?? "",
    status: issue.status,
    severity: issue.severity ?? "MEDIUM",
    platforms: issue.platforms.join(", "),
    affectedAreas: issue.affectedAreas.join(", "),
    reportedAt: issue.reportedAt.slice(0, 10),
    fixedInVersion: issue.fixedInVersion ?? "",
    isPublic: issue.isPublic,
    internalNotes: issue.internalNotes ?? "",
  };
}

function splitTags(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

const inputClass = "min-h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none placeholder:text-muted focus:border-ink focus:shadow-[0_0_0_3px_#17171710]";

export function KnownIssuesAdmin() {
  const [issues, setIssues] = useState<AdminKnownIssue[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setIssues(await request<AdminKnownIssue[]>("/admin/known-issues", { cache: "reload" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load known issues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load the admin-owned source of truth when this panel first mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function select(issue: AdminKnownIssue) {
    setEditingId(issue.id);
    setDraft(issueDraft(issue));
    setError("");
  }

  function startNew() {
    setEditingId(null);
    setDraft(blankDraft());
    setError("");
  }

  async function save() {
    if (saving || draft.title.trim().length < 4) return;
    setSaving(true);
    setError("");
    const payload: KnownIssueInput = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description?.trim() || null,
      workaround: draft.workaround?.trim() || null,
      platforms: splitTags(draft.platforms),
      affectedAreas: splitTags(draft.affectedAreas),
      reportedAt: draft.reportedAt
        ? new Date(`${draft.reportedAt}T12:00:00.000Z`).toISOString()
        : undefined,
      fixedInVersion: draft.fixedInVersion?.trim() || null,
      internalNotes: draft.internalNotes?.trim() || null,
    };
    try {
      if (editingId) {
        await request(`/admin/known-issues/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await request("/admin/known-issues", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await load();
      startNew();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save known issue");
    } finally {
      setSaving(false);
    }
  }

  async function toggleResolved(issue: AdminKnownIssue) {
    setError("");
    try {
      await request(`/admin/known-issues/${issue.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: issue.status === "RESOLVED" ? "INVESTIGATING" : "RESOLVED",
        }),
      });
      await load();
      if (editingId === issue.id) startNew();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update issue");
    }
  }

  return (
    <div className="min-h-full p-6 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-280">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[.13em] text-accent">User-facing status</p>
            <h2 className="m-0 mt-1 text-3xl font-black tracking-[-.035em] text-ink">Known Issues</h2>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-muted">Publish safe, concise issue updates without exposing reports or private technical notes.</p>
          </div>
          <button type="button" onClick={startNew} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-extrabold text-surface">
            <PlusIcon size={18} weight="bold" /> New issue
          </button>
        </div>

        {error ? <p className="mt-5 rounded-xl bg-danger-soft p-3 text-sm font-bold text-danger">{error}</p> : null}

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(300px,.8fr)_minmax(0,1.25fr)]">
          <section className="overflow-hidden rounded-[22px] border border-line bg-surface">
            <div className="border-b border-line p-4"><strong className="text-sm text-ink">Tracked issues</strong><span className="ml-2 text-xs text-muted">{issues.length}</span></div>
            <div className="max-h-[720px] overflow-y-auto p-2">
              {loading ? <p className="p-4 text-sm text-muted">Loading issues…</p> : null}
              {!loading && !issues.length ? <p className="p-4 text-sm text-muted">No known issues have been created yet.</p> : null}
              {issues.map((issue) => (
                <div key={issue.id} className={`mb-1 rounded-2xl p-2 transition ${editingId === issue.id ? "bg-accent-soft" : "hover:bg-soft"}`}>
                  <button type="button" onClick={() => select(issue)} className="w-full border-0 bg-transparent p-1 text-left">
                    <span className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-soft text-accent"><BugIcon size={19} weight="duotone" /></span>
                      <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">{issue.title}</strong><span className="mt-1 flex flex-wrap items-center gap-2"><KnownIssueStatusBadge status={issue.status} /><small className="text-muted">{issue.affectedCount} affected</small>{!issue.isPublic ? <small className="font-extrabold text-warning">Private</small> : null}</span></span>
                    </span>
                  </button>
                  <div className="mt-2 flex justify-end"><button type="button" onClick={() => void toggleResolved(issue)} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[10px] font-extrabold text-muted hover:bg-surface-hover">{issue.status === "RESOLVED" ? "Reopen" : "Resolve"}</button></div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-line bg-surface p-5 sm:p-6">
            <div className="mb-5"><p className="m-0 text-xs font-black uppercase tracking-[.1em] text-accent">{editingId ? "Edit issue" : "Create issue"}</p><h3 className="m-0 mt-1 text-xl font-black text-ink">Public issue details</h3></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-extrabold text-ink sm:col-span-2">Title<input className={inputClass} maxLength={140} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <label className="grid gap-2 text-xs font-extrabold text-ink">Status<CustomDropdown ariaLabel="Known issue status" value={draft.status} options={[{ value: "INVESTIGATING", label: "Investigating" }, { value: "IN_PROGRESS", label: "Fix in progress" }, { value: "FIXED_NEXT_RELEASE", label: "Fixed in next update" }, { value: "RESOLVED", label: "Resolved" }]} onChange={(value) => setDraft({ ...draft, status: value as KnownIssueStatus })} /></label>
              <label className="grid gap-2 text-xs font-extrabold text-ink">Severity<CustomDropdown ariaLabel="Known issue severity" value={draft.severity ?? "MEDIUM"} options={[{ value: "LOW", label: "Low" }, { value: "MEDIUM", label: "Medium" }, { value: "HIGH", label: "High" }, { value: "CRITICAL", label: "Critical" }]} onChange={(value) => setDraft({ ...draft, severity: value as KnownIssueSeverity })} /></label>
              <label className="grid gap-2 text-xs font-extrabold text-ink sm:col-span-2">Short description<textarea className={`${inputClass} min-h-28 resize-y py-3`} maxLength={2000} value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label className="grid gap-2 text-xs font-extrabold text-ink sm:col-span-2">Workaround <span className="font-medium text-muted">(optional, public)</span><textarea className={`${inputClass} min-h-22 resize-y py-3`} maxLength={1500} value={draft.workaround ?? ""} onChange={(event) => setDraft({ ...draft, workaround: event.target.value })} /></label>
              <label className="grid gap-2 text-xs font-extrabold text-ink">Platforms <span className="font-medium text-muted">comma separated</span><input className={inputClass} value={draft.platforms} placeholder="iOS, Android, Web" onChange={(event) => setDraft({ ...draft, platforms: event.target.value })} /></label>
              <label className="grid gap-2 text-xs font-extrabold text-ink">Affected areas <span className="font-medium text-muted">comma separated</span><input className={inputClass} value={draft.affectedAreas} placeholder="Feed, Map, Chat" onChange={(event) => setDraft({ ...draft, affectedAreas: event.target.value })} /></label>
              <label className="grid gap-2 text-xs font-extrabold text-ink">Date reported<input type="date" className={inputClass} value={draft.reportedAt ?? ""} onChange={(event) => setDraft({ ...draft, reportedAt: event.target.value })} /></label>
              <label className="grid gap-2 text-xs font-extrabold text-ink">Fixed in version <span className="font-medium text-muted">optional</span><input className={inputClass} maxLength={40} placeholder="1.15.2" value={draft.fixedInVersion ?? ""} onChange={(event) => setDraft({ ...draft, fixedInVersion: event.target.value })} /></label>
              <label className="grid gap-2 text-xs font-extrabold text-ink sm:col-span-2">Internal notes <span className="font-medium text-muted">never public</span><textarea className={`${inputClass} min-h-24 resize-y py-3`} maxLength={5000} value={draft.internalNotes ?? ""} onChange={(event) => setDraft({ ...draft, internalNotes: event.target.value })} /></label>
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl bg-soft p-4"><input type="checkbox" checked={draft.isPublic} onChange={(event) => setDraft({ ...draft, isPublic: event.target.checked })} className="size-4 accent-accent" /><span><strong className="block text-sm text-ink">Visible to users</strong><small className="mt-0.5 block text-muted">Private issues stay in this admin page only.</small></span></label>
            <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={startNew} className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-extrabold text-ink">Clear</button><button type="button" disabled={saving || draft.title.trim().length < 4} onClick={() => void save()} className="min-h-11 rounded-xl bg-ink px-5 text-sm font-extrabold text-surface disabled:opacity-45">{saving ? "Saving…" : editingId ? "Save changes" : "Create issue"}</button></div>
          </section>
        </div>
      </div>
    </div>
  );
}
