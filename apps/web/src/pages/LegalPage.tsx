import { useEffect } from "react";
import {
  LEGAL_URLS,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
} from "@findeat/legal";
import type { LegalDocument } from "@findeat/legal";
import type { LegalPageKind } from "../lib/legalRoutes";

function LegalHeader({ active }: { active: LegalPageKind }) {
  const navClass = (selected: boolean) =>
    `block w-auto rounded-full px-3.25 py-2.25 text-xs font-extrabold no-underline transition ${selected ? "bg-[#171717] text-[#faf9f6]" : "text-[#69645d] hover:bg-[#f3efe9] hover:text-ink dark:text-muted dark:hover:bg-surface-hover"}`;
  return (
    <header className="sticky top-0 z-40 grid h-19 w-full grid-cols-[1fr_auto_1fr] items-center border-b border-[#e7e2db] bg-[#fffdfa]/95 px-11 backdrop-blur-lg dark:border-line dark:bg-surface/95 max-[820px]:grid-cols-[1fr_auto] max-[820px]:px-5">
      <a className="inline-flex items-center justify-self-start gap-2.5 text-ink no-underline" href="/">
        <span className="grid size-9 place-items-center rounded-xl bg-ink text-[19px] font-black text-[#faf9f6]">F</span>
        <strong className="text-lg tracking-[-.02em]">FindEat</strong>
      </a>
      <nav className="flex items-center gap-1 max-[820px]:hidden" aria-label="Legal pages">
        <a className={navClass(active === "privacy")} href="/privacy">
          Privacy
        </a>
        <a className={navClass(active === "terms")} href="/terms">
          Terms
        </a>
        <a
          className={navClass(active === "account-deletion")}
          href="/account-deletion"
        >
          Delete account
        </a>
      </nav>
      <a className="justify-self-end rounded-[11px] border border-line bg-surface px-3.5 py-2.5 text-xs font-extrabold text-ink no-underline hover:bg-surface-hover" href="/login">
        Business sign in
      </a>
    </header>
  );
}

function LegalFooter() {
  return (
    <footer className="grid min-h-25 grid-cols-[auto_1fr_auto] items-center gap-4 border-t border-line bg-[#171717] px-11 py-6 text-[#faf9f6] max-[820px]:grid-cols-1 max-[820px]:px-5.5">
      <strong>FindEat</strong>
      <span className="text-xs text-[#aaa39b]">Find places worth sharing.</span>
      <nav className="flex gap-1.25 max-[820px]:flex-wrap" aria-label="Footer legal links">
        <a className="px-2.5 py-2 text-[11px] font-bold text-[#d8d2cb] no-underline hover:bg-white/5 hover:text-[#faf9f6] max-[820px]:pl-0 max-[820px]:pr-3.5" href={LEGAL_URLS.privacy}>Privacy Policy</a>
        <a className="px-2.5 py-2 text-[11px] font-bold text-[#d8d2cb] no-underline hover:bg-white/5 hover:text-[#faf9f6] max-[820px]:pl-0 max-[820px]:pr-3.5" href={LEGAL_URLS.terms}>Terms of Service</a>
        <a className="px-2.5 py-2 text-[11px] font-bold text-[#d8d2cb] no-underline hover:bg-white/5 hover:text-[#faf9f6] max-[820px]:pl-0 max-[820px]:pr-3.5" href={LEGAL_URLS.accountDeletion}>Account deletion</a>
      </nav>
    </footer>
  );
}

function DocumentPage({
  active,
  document: legalDocument,
}: {
  active: "privacy" | "terms";
  document: LegalDocument;
}) {
  useEffect(() => {
    document.title = `${legalDocument.title} | FindEat`;
  }, [legalDocument.title]);

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_8%_2%,#fff0e9_0,transparent_28%)] bg-[#fbfaf8] text-ink dark:bg-[radial-gradient(circle_at_8%_2%,#3a211c_0,transparent_28%)] dark:bg-page">
      <LegalHeader active={active} />
      <main className="mx-auto grid w-full max-w-295 grid-cols-[220px_minmax(0,760px)] items-start justify-center gap-16 px-8.5 pt-17.5 pb-25 max-[820px]:block max-[820px]:px-4.5 max-[820px]:py-10">
        <aside className="sticky top-28 max-h-[calc(100vh-144px)] overflow-y-auto border-r border-line pr-5 max-[820px]:hidden">
          <span className="mb-3.5 block text-[10px] font-black tracking-[.12em] text-[#b46745]">ON THIS PAGE</span>
          {legalDocument.sections.map((section) => (
            <a className="block py-1.5 text-[11px] leading-[1.35] font-semibold text-[#78726a] no-underline hover:text-ink"
              key={section.title}
              href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              {section.title.replace(/^\d+\.\s*/, "")}
            </a>
          ))}
        </aside>
        <article className="min-w-0">
          <div className="mb-12 rounded-[30px] border border-[#e4ded5] bg-surface px-10.5 py-9.5 shadow-[0_24px_70px_#44351d0a] max-[820px]:rounded-3xl max-[820px]:px-6 max-[820px]:py-7">
            <p className="mt-0 mb-2 text-xs font-extrabold tracking-[.12em] text-accent">FINDEAT LEGAL</p>
            <h1 className="mb-2.5 max-w-170 text-[clamp(40px,6vw,66px)] leading-[.98] tracking-[-.055em]">{legalDocument.title}</h1>
            <p className="mt-0 mb-6.5 text-xs font-extrabold text-[#b46745]">
              Effective date: {legalDocument.effectiveDate}
            </p>
            {legalDocument.introduction.map((paragraph) => (
              <p className="text-base leading-7 text-[#625d56] dark:text-muted" key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {legalDocument.sections.map((section) => (
            <section className="mb-8.5 scroll-mt-26 border-b border-line px-2 pb-8.5 last:border-b-0"
              key={section.title}
              id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
            >
              <h2 className="mb-3.5 text-2xl leading-tight tracking-[-.025em] text-ink">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p className="mb-3.25 text-sm leading-7 text-[#5f5a53] dark:text-muted" key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets?.length ? (
                <ul className="list-disc pl-5.5">
                  {section.bullets.map((bullet) => (
                    <li className="mb-1.75 pl-1.25 text-sm leading-7 text-[#5f5a53] dark:text-muted" key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>
      </main>
      <LegalFooter />
    </div>
  );
}

function AccountDeletionPage() {
  useEffect(() => {
    document.title = "Delete your FindEat account | FindEat";
  }, []);

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_8%_2%,#fff0e9_0,transparent_28%)] bg-[#fbfaf8] text-ink dark:bg-[radial-gradient(circle_at_8%_2%,#3a211c_0,transparent_28%)] dark:bg-page">
      <LegalHeader active="account-deletion" />
      <main className="mx-auto w-full max-w-260 px-8.5 pt-19.5 pb-25 max-[820px]:px-4.5 max-[820px]:py-12">
        <section className="mb-10.5 max-w-185">
          <p className="mb-2 text-xs font-extrabold tracking-[.12em] text-accent">YOUR ACCOUNT, YOUR CHOICE</p>
          <h1 className="mb-4.25 text-[clamp(43px,7vw,72px)] leading-[.96] tracking-[-.055em]">Delete your FindEat account</h1>
          <p className="max-w-167.5 text-[17px] leading-[1.7] text-[#5f5a53] dark:text-muted">
            You can permanently delete your account and associated data from
            the FindEat app. If you cannot access the app, you can submit a
            deletion request by email.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-4.5 max-[820px]:grid-cols-1">
          <section className="rounded-3xl border border-[#e4ded5] bg-surface p-7 shadow-[0_18px_55px_#44351d08] max-[820px]:p-6">
            <span className="mb-4.5 inline-flex rounded-full bg-accent-soft px-2.25 py-1.25 text-[10px] font-black tracking-[.06em] text-accent uppercase">Recommended</span>
            <h2 className="mb-3.5 text-2xl tracking-[-.025em]">Delete from the app</h2>
            <ol className="list-decimal pl-5.5">
              <li className="mb-1.75 pl-1.25 text-sm leading-7 text-[#5f5a53] dark:text-muted">Open your profile and tap Settings.</li>
              <li className="mb-1.75 pl-1.25 text-sm leading-7 text-[#5f5a53] dark:text-muted">Open Password and security.</li>
              <li className="mb-1.75 pl-1.25 text-sm leading-7 text-[#5f5a53] dark:text-muted">Choose Delete account.</li>
              <li className="mb-1.75 pl-1.25 text-sm leading-7 text-[#5f5a53] dark:text-muted">Review what will be deleted and confirm with your password.</li>
            </ol>
            <p className="text-sm leading-7 text-[#5f5a53] dark:text-muted">
              The app completes the deletion after you confirm. You will be
              signed out and the account cannot be recovered.
            </p>
          </section>

          <section className="rounded-3xl border border-[#e4ded5] bg-surface p-7 shadow-[0_18px_55px_#44351d08] max-[820px]:p-6">
            <span className="mb-4.5 inline-flex rounded-full bg-accent-soft px-2.25 py-1.25 text-[10px] font-black tracking-[.06em] text-accent uppercase">No app access?</span>
            <h2 className="mb-3.5 text-2xl tracking-[-.025em]">Request deletion by email</h2>
            <p className="text-sm leading-7 text-[#5f5a53] dark:text-muted">
              Email us from the address connected to your FindEat account. Use
              the subject “Delete my FindEat account” and include your
              username.
            </p>
            <a
              className="my-1 mb-4.25 inline-flex rounded-[11px] bg-soft px-3.25 py-2.5 font-bold text-[#aa4f31] no-underline"
              href="mailto:privacy@findeat.space?subject=Delete%20my%20FindEat%20account"
            >
              privacy@findeat.space
            </a>
            <p className="text-sm leading-7 text-[#5f5a53] dark:text-muted">
              We may ask you to verify account ownership. We will respond and
              complete a valid request within 30 days, unless applicable law
              requires a different period.
            </p>
          </section>
        </div>

        <section className="mt-4.5 rounded-3xl border border-[#e4ded5] bg-surface p-7.5 shadow-[0_18px_55px_#44351d08] max-[820px]:p-6">
          <h2 className="mb-3.5 text-2xl tracking-[-.025em]">What deletion removes</h2>
          <ul className="list-disc pl-5.5">
            <li className="mb-1.75 pl-1.25 text-sm leading-7 text-[#5f5a53] dark:text-muted">Profile details, settings, profile photo, and cover photo.</li>
            <li className="mb-1.75 pl-1.25 text-sm leading-7 text-[#5f5a53] dark:text-muted">Posts, reviews, uploaded post media, drafts, and social activity.</li>
            <li className="mb-1.75 pl-1.25 text-sm leading-7 text-[#5f5a53] dark:text-muted">Follows, likes, saves, folders, notifications, and support requests.</li>
            <li className="mb-1.75 pl-1.25 text-sm leading-7 text-[#5f5a53] dark:text-muted">Restaurant claims, ownership, and management access.</li>
          </ul>
          <p className="text-sm leading-7 text-[#5f5a53] dark:text-muted">
            Messages are marked deleted and comments are cleared so other
            users’ conversations and threads remain structurally
            understandable without identifying you. Temporary backup copies
            and limited security or legal records may remain for a limited
            period as described in our <a className="font-bold text-[#aa4f31]" href="/privacy">Privacy Policy</a>.
          </p>
          <p className="text-sm leading-7 text-[#5f5a53] dark:text-muted">
            If you only want a break, the app also offers account deactivation.
            Deactivation hides your account without deleting its data.
          </p>
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}

export function PublicLegalPage({ kind }: { kind: LegalPageKind }) {
  if (kind === "privacy") {
    return <DocumentPage active="privacy" document={PRIVACY_POLICY} />;
  }
  if (kind === "terms") {
    return <DocumentPage active="terms" document={TERMS_OF_SERVICE} />;
  }
  return <AccountDeletionPage />;
}
