import { useEffect } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CloudSlashIcon } from "@phosphor-icons/react/dist/csr/CloudSlash";
import { CompassIcon } from "@phosphor-icons/react/dist/csr/Compass";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { LockKeyIcon } from "@phosphor-icons/react/dist/csr/LockKey";
import { WarningOctagonIcon } from "@phosphor-icons/react/dist/csr/WarningOctagon";

export type ErrorPageStatus = 403 | 404 | 500 | 503;

type ErrorAction = {
  label: string;
  onClick: () => void;
};

type ErrorPageProps = {
  status: ErrorPageStatus;
  title?: string;
  description?: string;
  detail?: string;
  primaryAction?: ErrorAction;
  secondaryAction?: ErrorAction;
};

const errorContent: Record<
  ErrorPageStatus,
  { eyebrow: string; title: string; description: string }
> = {
  403: {
    eyebrow: "ACCESS DENIED",
    title: "This table isn’t yours.",
    description:
      "You don’t have permission to open this area. If you think this is a mistake, ask a FindEat administrator for access.",
  },
  404: {
    eyebrow: "PAGE NOT FOUND",
    title: "This place isn’t on the map.",
    description:
      "The page may have moved, the link may be outdated, or perhaps it never existed. Let’s get you somewhere useful.",
  },
  500: {
    eyebrow: "SOMETHING WENT WRONG",
    title: "We dropped the plate.",
    description:
      "An unexpected error stopped this page from loading. Your data is safe—try again in a moment.",
  },
  503: {
    eyebrow: "TEMPORARILY UNAVAILABLE",
    title: "The kitchen is taking a break.",
    description:
      "FindEat can’t reach the service right now. Check your connection or try again shortly.",
  },
};

function ErrorIllustration({ status }: { status: ErrorPageStatus }) {
  const Icon =
    status === 403
      ? LockKeyIcon
      : status === 404
        ? CompassIcon
        : status === 503
          ? CloudSlashIcon
          : WarningOctagonIcon;
  const pinTone = status === 403
    ? "bg-warning"
    : status === 500 || status === 503
      ? "bg-danger text-page"
      : "bg-accent text-[#171717]";

  return (
    <div className="relative grid aspect-square w-[min(390px,34vw)] place-items-center justify-self-center before:absolute before:inset-[10%] before:rounded-full before:border before:border-dashed before:border-accent/45 before:content-[''] before:animate-[spin_32s_linear_infinite] after:absolute after:inset-1/4 after:rounded-full after:bg-surface/90 after:shadow-[0_30px_90px_#00000012,inset_0_0_0_1px_var(--line)] after:backdrop-blur-xl after:content-[''] motion-reduce:before:animate-none max-[760px]:row-start-1 max-[760px]:w-[min(270px,72vw)]" aria-hidden="true">
      <span className="absolute top-[8%] left-[48%] z-2 size-3.5 rounded-full border-4 border-page bg-accent shadow-[0_5px_18px_color-mix(in_srgb,var(--accent)_55%,transparent)]" />
      <span className="absolute right-[7%] bottom-[27%] z-2 size-2.5 rounded-full border-4 border-page bg-warning" />
      <span className={`absolute top-[27%] z-4 grid size-26 -rotate-45 place-items-center rounded-[52%_52%_52%_12%] shadow-[0_22px_45px_color-mix(in_srgb,var(--accent)_33%,transparent)] ${pinTone}`}>
        <Icon className="rotate-45" size={55} weight="duotone" />
      </span>
      <b className="absolute bottom-[24%] z-4 text-[clamp(34px,5vw,58px)] tracking-[-.07em]">{status}</b>
      <i className="absolute bottom-[18%] z-3 h-3 w-[34%] rounded-full bg-black/15 blur-lg" />
    </div>
  );
}

export function ErrorPage({
  status,
  title,
  description,
  detail,
  primaryAction,
  secondaryAction,
}: ErrorPageProps) {
  const content = errorContent[status];

  useEffect(() => {
    document.title = `${status} · ${title ?? content.title} | FindEat`;
    return () => {
      document.title = "FindEat for Business";
    };
  }, [content.title, status, title]);

  return (
    <main className="relative isolate grid min-h-dvh grid-rows-[auto_1fr_auto] overflow-hidden bg-page px-[clamp(24px,5vw,72px)] pt-8 pb-6.5 text-ink before:absolute before:top-[-24vw] before:right-[-14vw] before:-z-2 before:size-[60vw] before:rounded-full before:bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_17%,transparent),transparent_68%)] before:content-[''] after:absolute after:bottom-[-32vw] after:left-[-20vw] after:-z-2 after:size-[70vw] after:rounded-full after:bg-[radial-gradient(circle,color-mix(in_srgb,var(--warning)_12%,transparent),transparent_68%)] after:content-[''] max-[760px]:px-5.5 max-[760px]:pt-5.5 max-[760px]:pb-6">
      <div className="absolute inset-0 -z-1 bg-[linear-gradient(color-mix(in_srgb,var(--line)_58%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--line)_58%,transparent)_1px,transparent_1px)] bg-size-[56px_56px] opacity-40 [mask-image:linear-gradient(to_bottom,#0b0b0a,transparent_82%)]" aria-hidden="true" />
      <a className="inline-flex items-center justify-self-start gap-2.75 text-ink no-underline" href="/" aria-label="FindEat home">
        <span className="grid size-11 place-items-center rounded-[15px] border border-line bg-surface shadow-panel">
          <img className="size-7.75 object-contain" src="/findeat-favicon.svg" alt="" />
        </span>
        <strong className="text-[19px] tracking-[-.03em]">FindEat</strong>
      </a>

      <section className="mx-auto grid w-full max-w-280 grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)] items-center gap-[clamp(40px,7vw,110px)] py-13.5 max-[760px]:grid-cols-1 max-[760px]:gap-4 max-[760px]:py-11">
        <div className="max-w-147.5 max-[760px]:text-center">
          <p className="mt-0 mb-3.5 text-xs font-extrabold tracking-[.12em] text-accent">{content.eyebrow}</p>
          <h1 className="mb-5 max-w-162.5 text-[clamp(48px,7vw,88px)] leading-[.92] tracking-[-.065em] text-balance max-[760px]:text-[clamp(44px,14vw,68px)]">{title ?? content.title}</h1>
          <p className="mb-0 max-w-142.5 text-[clamp(16px,2vw,19px)] leading-[1.65] text-muted max-[760px]:mx-auto">{description ?? content.description}</p>
          {detail ? <small className="mt-4.5 block max-w-142.5 truncate rounded-xl border border-line bg-surface/70 px-3.75 py-3 text-[11px] leading-normal text-muted max-[760px]:mx-auto">{detail}</small> : null}
          {(primaryAction || secondaryAction) && (
            <div className="mt-7.5 flex items-center gap-2.75 max-[760px]:justify-center max-[460px]:flex-col max-[460px]:items-stretch">
              {primaryAction ? (
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-0 bg-accent px-4.75 font-extrabold text-[#171717] shadow-[0_12px_30px_color-mix(in_srgb,var(--accent)_25%,transparent)] transition hover:-translate-y-px hover:brightness-95"
                  onClick={primaryAction.onClick}
                >
                  {status === 500 || status === 503 ? (
                    <ArrowClockwiseIcon size={18} weight="bold" />
                  ) : (
                    <HouseIcon size={18} weight="bold" />
                  )}
                  {primaryAction.label}
                </button>
              ) : null}
              {secondaryAction ? (
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-soft px-4.75 font-extrabold text-ink transition hover:-translate-y-px hover:bg-surface-hover"
                  onClick={secondaryAction.onClick}
                >
                  <ArrowLeftIcon size={18} weight="bold" />
                  {secondaryAction.label}
                </button>
              ) : null}
            </div>
          )}
        </div>
        <ErrorIllustration status={status} />
      </section>

      <p className="m-0 self-end justify-self-center text-xs text-muted max-[460px]:text-center">
        Hungry for help?{" "}
        <a className="font-extrabold text-ink" href="mailto:support@findeat.space">support@findeat.space</a>
      </p>
    </main>
  );
}
