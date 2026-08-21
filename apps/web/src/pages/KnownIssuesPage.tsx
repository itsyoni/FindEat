import { ArrowClockwiseIcon, BugIcon } from "@phosphor-icons/react";
import type { KnownIssue } from "@findeat/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KnownIssuesList } from "../components/known-issues/KnownIssuesList";
import { request } from "../lib/api";

export function KnownIssuesPage() {
  const [issues, setIssues] = useState<KnownIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvedOpen, setResolvedOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setIssues(await request<KnownIssue[]>("/known-issues", { cache: "reload" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load known issues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Known Issues | FindEat";
    // Fetch once on route entry; subsequent retries are user initiated.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const active = useMemo(() => issues.filter((issue) => issue.status !== "RESOLVED"), [issues]);
  const resolved = useMemo(() => issues.filter((issue) => issue.status === "RESOLVED"), [issues]);

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_8%_2%,#fff0e9_0,transparent_30%)] bg-page text-ink dark:bg-[radial-gradient(circle_at_8%_2%,#3a211c_0,transparent_30%)]">
      <header className="sticky top-0 z-40 flex h-19 items-center justify-between border-b border-line bg-surface/95 px-5 backdrop-blur-lg sm:px-11">
        <a className="inline-flex items-center gap-2.5 text-ink no-underline" href="/">
          <span className="grid size-9 place-items-center rounded-xl bg-ink text-[19px] font-black text-surface">F</span>
          <strong className="text-lg tracking-[-.02em]">FindEat</strong>
        </a>
        <a className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs font-extrabold text-ink no-underline hover:bg-surface-hover" href="/login">
          Business sign in
        </a>
      </header>

      <main className="mx-auto w-full max-w-245 px-4.5 py-10 sm:px-8 sm:py-16">
        <section className="mb-8 rounded-[30px] border border-line bg-surface p-7 shadow-panel sm:p-10">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <BugIcon size={27} weight="duotone" />
          </span>
          <p className="m-0 mt-5 text-xs font-black uppercase tracking-[.14em] text-accent">FindEat status</p>
          <h1 className="m-0 mt-2 text-[clamp(38px,7vw,64px)] leading-none tracking-[-.055em]">Known Issues</h1>
          <p className="m-0 mt-4 max-w-2xl text-base leading-7 text-muted">
            We’re tracking these issues and working on them. If you’re experiencing one too, let us know from Help &amp; Feedback in the FindEat app.
          </p>
        </section>

        {loading ? (
          <div className="grid gap-4" aria-label="Loading known issues">
            {[0, 1, 2].map((item) => <div key={item} className="h-46 animate-pulse rounded-[22px] border border-line bg-surface" />)}
          </div>
        ) : error ? (
          <div className="rounded-[22px] border border-danger/20 bg-danger-soft p-6 text-danger">
            <strong>Known Issues couldn’t be loaded.</strong>
            <p className="my-2 text-sm">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-extrabold text-surface">
              <ArrowClockwiseIcon size={17} weight="bold" /> Retry
            </button>
          </div>
        ) : (
          <>
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><p className="m-0 text-xs font-black uppercase tracking-[.12em] text-accent">Current status</p><h2 className="m-0 mt-1 text-2xl font-black">Active issues</h2></div>
                <span className="rounded-full bg-soft px-3 py-2 text-xs font-extrabold text-muted">{active.length} active</span>
              </div>
              <KnownIssuesList issues={active} empty />
            </section>

            {resolved.length ? (
              <section className="mt-10 border-t border-line pt-7">
                <button type="button" onClick={() => setResolvedOpen((open) => !open)} className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface p-4 text-left text-ink">
                  <span><strong className="block">Resolved issues</strong><small className="mt-1 block text-muted">{resolved.length} previously tracked</small></span>
                  <span className="text-sm font-extrabold text-muted">{resolvedOpen ? "Hide" : "Show"}</span>
                </button>
                {resolvedOpen ? <div className="mt-4"><KnownIssuesList issues={resolved} /></div> : null}
              </section>
            ) : null}
          </>
        )}
      </main>
      <footer className="flex min-h-24 flex-wrap items-center justify-between gap-3 border-t border-line bg-[#171717] px-5 py-6 text-[#faf9f6] sm:px-11">
        <div><strong>FindEat</strong><span className="ml-3 text-xs text-[#aaa39b]">Find places worth sharing.</span></div>
        <nav className="flex gap-4 text-xs font-bold"><a className="text-[#d8d2cb] no-underline" href="/privacy">Privacy</a><a className="text-[#d8d2cb] no-underline" href="/terms">Terms</a></nav>
      </footer>
    </div>
  );
}
