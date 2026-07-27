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

  return (
    <div className={`error-illustration status-${status}`} aria-hidden="true">
      <span className="error-orbit orbit-one" />
      <span className="error-orbit orbit-two" />
      <span className="error-pin">
        <Icon size={55} weight="duotone" />
      </span>
      <b>{status}</b>
      <i />
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
    <main className="error-page">
      <div className="error-page-glow" aria-hidden="true" />
      <a className="error-brand" href="/" aria-label="FindEat home">
        <span>
          <img src="/findeat-favicon.svg" alt="" />
        </span>
        <strong>FindEat</strong>
      </a>

      <section className="error-page-card">
        <div className="error-page-copy">
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{title ?? content.title}</h1>
          <p>{description ?? content.description}</p>
          {detail ? <small>{detail}</small> : null}
          {(primaryAction || secondaryAction) && (
            <div className="error-page-actions">
              {primaryAction ? (
                <button
                  type="button"
                  className="primary"
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
                  className="secondary"
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

      <p className="error-page-footnote">
        Hungry for help?{" "}
        <a href="mailto:support@findeat.space">support@findeat.space</a>
      </p>
    </main>
  );
}
