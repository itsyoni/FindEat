import { ArrowClockwiseIcon, CheckCircleIcon, LightbulbIcon, RocketLaunchIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import type { PlannedFeature, PlannedFeatureStatus } from "@findeat/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicFeedbackDialog, type PublicFeedbackKind } from "../components/PublicFeedbackDialog";
import { request } from "../lib/api";

const statusCopy: Record<PlannedFeatureStatus, { label: string; className: string }> = {
  PLANNED: { label: "Planned", className: "bg-soft text-muted" },
  IN_PROGRESS: { label: "In progress", className: "bg-[#e7f1ff] text-[#2364a9] dark:bg-[#193454] dark:text-[#8fc5ff]" },
  COMING_SOON: { label: "Coming soon", className: "bg-accent-soft text-accent" },
  RELEASED: { label: "Released", className: "bg-success-soft text-success" },
};

export function UpcomingFeaturesPage() {
  const [features, setFeatures] = useState<PlannedFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [releasedOpen, setReleasedOpen] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<PublicFeedbackKind | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFeatures(await request<PlannedFeature[]>("/planned-features", { cache: "reload" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load upcoming features");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Upcoming Features | FindEat";
    // Fetch once on route entry; retries remain user initiated.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const active = useMemo(() => features.filter((feature) => feature.status !== "RELEASED"), [features]);
  const released = useMemo(() => features.filter((feature) => feature.status === "RELEASED"), [features]);

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_8%_2%,#fff0e9_0,transparent_30%)] bg-page text-ink dark:bg-[radial-gradient(circle_at_8%_2%,#3a211c_0,transparent_30%)]">
      <header className="sticky top-0 z-40 flex min-h-19 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur-lg sm:px-11">
        <a className="inline-flex items-center gap-2.5 text-ink no-underline" href="/"><span className="grid size-9 place-items-center rounded-xl bg-ink text-[19px] font-black text-surface">F</span><strong className="text-lg tracking-[-.02em]">FindEat</strong></a>
        <nav className="flex items-center gap-2 text-xs font-extrabold">
          <a className="rounded-xl px-3.5 py-2.5 text-muted no-underline hover:bg-soft hover:text-ink" href="/known-issues">Known issues</a>
          <a className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink no-underline hover:bg-surface-hover" href="/login">Business sign in</a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-245 px-4.5 py-10 sm:px-8 sm:py-16">
        <section className="mb-8 rounded-[30px] border border-line bg-surface p-7 shadow-panel sm:p-10">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"><RocketLaunchIcon size={28} weight="duotone" /></span>
          <p className="m-0 mt-5 text-xs font-black uppercase tracking-[.14em] text-accent">What we’re building</p>
          <h1 className="m-0 mt-2 text-[clamp(38px,7vw,64px)] leading-none tracking-[-.055em]">Upcoming Features</h1>
          <p className="m-0 mt-4 max-w-2xl text-base leading-7 text-muted">A transparent look at improvements and features planned for FindEat. Plans may evolve as we learn from the community.</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <button type="button" onClick={() => setFeedbackKind("FEATURE_REQUEST")} className="inline-flex items-center gap-2 rounded-xl border-0 bg-accent px-4 py-3 text-sm font-extrabold text-[#faf9f6]"><LightbulbIcon size={18} weight="fill" /> Suggest a feature</button>
            <button type="button" onClick={() => setFeedbackKind("BUG")} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-extrabold text-ink">Spotted a bug?</button>
          </div>
        </section>

        {loading ? <div className="grid gap-4">{[0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-[22px] border border-line bg-surface" />)}</div> : error ? (
          <div className="rounded-[22px] border border-danger/20 bg-danger-soft p-6 text-danger"><strong>Upcoming features couldn’t be loaded.</strong><p className="my-2 text-sm">{error}</p><button type="button" onClick={() => void load()} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-extrabold text-surface"><ArrowClockwiseIcon size={17} weight="bold" /> Retry</button></div>
        ) : (
          <>
            <section>
              <div className="mb-4 flex items-end justify-between gap-4"><div><p className="m-0 text-xs font-black uppercase tracking-[.12em] text-accent">On the roadmap</p><h2 className="m-0 mt-1 text-2xl font-black">Planned and in progress</h2></div><span className="rounded-full bg-soft px-3 py-2 text-xs font-extrabold text-muted">{active.length} items</span></div>
              {active.length ? <div className="grid gap-4 sm:grid-cols-2">{active.map((feature) => (
                <article key={feature.id} className="rounded-[22px] border border-line bg-surface p-5 shadow-panel">
                  <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1.5 text-[11px] font-black ${statusCopy[feature.status].className}`}>{statusCopy[feature.status].label}</span>{feature.targetLabel ? <span className="text-xs font-bold text-muted">{feature.targetLabel}</span> : null}</div>
                  <h3 className="mb-2 mt-4 text-xl tracking-[-.025em]">{feature.title}</h3>
                  {feature.description ? <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-muted">{feature.description}</p> : null}
                  {feature.status === "IN_PROGRESS" ? <SpinnerGapIcon className="mt-5 text-accent" size={20} weight="bold" /> : null}
                </article>
              ))}</div> : <div className="rounded-[22px] border border-dashed border-line bg-surface p-8 text-center text-muted">No public roadmap items yet. Suggest what we should build next.</div>}
            </section>
            {released.length ? <section className="mt-10 border-t border-line pt-7"><button type="button" onClick={() => setReleasedOpen((open) => !open)} className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface p-4 text-left text-ink"><span className="flex items-center gap-3"><CheckCircleIcon size={24} className="text-success" weight="fill" /><span><strong className="block">Recently released</strong><small className="mt-1 block text-muted">{released.length} completed improvements</small></span></span><span className="text-sm font-extrabold text-muted">{releasedOpen ? "Hide" : "Show"}</span></button>{releasedOpen ? <div className="mt-4 grid gap-4 sm:grid-cols-2">{released.map((feature) => <article key={feature.id} className="rounded-[22px] border border-line bg-surface p-5"><span className="text-xs font-black text-success">RELEASED</span><h3 className="mb-2 mt-2 text-lg">{feature.title}</h3>{feature.description ? <p className="m-0 text-sm leading-6 text-muted">{feature.description}</p> : null}</article>)}</div> : null}</section> : null}
          </>
        )}
      </main>
      <footer className="flex min-h-24 flex-wrap items-center justify-between gap-3 border-t border-line bg-[#171717] px-5 py-6 text-[#faf9f6] sm:px-11"><div><strong>FindEat</strong><span className="ml-3 text-xs text-[#aaa39b]">Find places worth sharing.</span></div><nav className="flex gap-4 text-xs font-bold"><a className="text-[#d8d2cb] no-underline" href="/privacy">Privacy</a><a className="text-[#d8d2cb] no-underline" href="/terms">Terms</a></nav></footer>
      <PublicFeedbackDialog kind={feedbackKind} onClose={() => setFeedbackKind(null)} />
    </div>
  );
}
