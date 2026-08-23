import { BugIcon, CheckCircleIcon, LightbulbIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import { request } from "../lib/api";

export type PublicFeedbackKind = "BUG" | "FEATURE_REQUEST";

type Props = {
  kind: PublicFeedbackKind | null;
  onClose: () => void;
};

export function PublicFeedbackDialog({ kind, onClose }: Props) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!kind) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [kind, onClose]);

  if (!kind) return null;
  const isBug = kind === "BUG";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await request("/public-feedback", {
        method: "POST",
        body: JSON.stringify({ category: kind, subject, message, name: name || undefined, email: email || undefined, website }),
      });
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send your feedback");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="relative max-h-[92dvh] w-full max-w-145 overflow-y-auto rounded-[28px] border border-line bg-surface p-6 text-ink shadow-[0_28px_90px_#0005] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 grid size-10 place-items-center rounded-full border-0 bg-soft text-ink" aria-label="Close">
          <XIcon size={19} weight="bold" />
        </button>
        {submitted ? (
          <div className="grid min-h-80 place-items-center text-center">
            <div>
              <span className="mx-auto grid size-15 place-items-center rounded-2xl bg-success-soft text-success"><CheckCircleIcon size={34} weight="fill" /></span>
              <h2 className="mt-5 text-3xl">Thank you.</h2>
              <p className="mx-auto max-w-sm leading-6 text-muted">Your {isBug ? "bug report" : "feature idea"} reached the FindEat team for review.</p>
              <button type="button" onClick={onClose} className="mt-3 rounded-xl border-0 bg-ink px-6 py-3 font-extrabold text-surface">Done</button>
            </div>
          </div>
        ) : (
          <>
            <span className={`grid size-12 place-items-center rounded-2xl ${isBug ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"}`}>
              {isBug ? <BugIcon size={27} weight="duotone" /> : <LightbulbIcon size={27} weight="duotone" />}
            </span>
            <p className="mt-5 mb-1 text-xs font-black uppercase tracking-[.12em] text-accent">Help shape FindEat</p>
            <h2 id="feedback-dialog-title" className="m-0 text-3xl tracking-[-.035em]">{isBug ? "Spotted a bug?" : "Suggest a feature"}</h2>
            <p className="mt-2 leading-6 text-muted">{isBug ? "Tell us what happened and what you expected instead." : "Tell us what would make FindEat more useful for you."}</p>
            <form className="mt-6 grid gap-4" onSubmit={submit}>
              <label className="grid gap-2 text-sm font-bold">Short title
                <input className="min-h-12 rounded-xl border border-line bg-surface-subtle px-3.5 text-ink outline-none focus:border-accent focus:ring-3 focus:ring-accent/15" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={120} required placeholder={isBug ? "What isn’t working?" : "What should FindEat add?"} />
              </label>
              <label className="grid gap-2 text-sm font-bold">Details
                <textarea className="min-h-34 resize-y rounded-xl border border-line bg-surface-subtle p-3.5 text-ink outline-none focus:border-accent focus:ring-3 focus:ring-accent/15" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} required placeholder="The more context you share, the better we can understand it." />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">Name <span className="font-normal text-muted">(optional)</span>
                  <input className="min-h-12 rounded-xl border border-line bg-surface-subtle px-3.5 text-ink outline-none focus:border-accent" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" />
                </label>
                <label className="grid gap-2 text-sm font-bold">Email <span className="font-normal text-muted">(optional)</span>
                  <input className="min-h-12 rounded-xl border border-line bg-surface-subtle px-3.5 text-ink outline-none focus:border-accent" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} type="email" autoComplete="email" />
                </label>
              </div>
              <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
              {error ? <p className="m-0 rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger" role="alert">{error}</p> : null}
              <button type="submit" disabled={saving} className="mt-1 min-h-12 rounded-xl border-0 bg-accent px-5 font-extrabold text-[#faf9f6] disabled:opacity-55">{saving ? "Sending…" : isBug ? "Send bug report" : "Send suggestion"}</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
