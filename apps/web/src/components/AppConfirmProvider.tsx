import { WarningDiamondIcon } from "@phosphor-icons/react/dist/csr/WarningDiamond";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { QuestionIcon } from "@phosphor-icons/react/dist/csr/Question";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { registerConfirmHandler, type ConfirmRequest } from "../lib/appConfirm";

type PendingConfirm = ConfirmRequest & {
  resolve: (confirmed: boolean) => void;
};

export function AppConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [closing, setClosing] = useState(false);
  const pendingRef = useRef<PendingConfirm | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestConfirm = useCallback(
    (request: ConfirmRequest) =>
      new Promise<boolean>((resolve) => {
        const next = { ...request, resolve };
        pendingRef.current?.resolve(false);
        pendingRef.current = next;
        setClosing(false);
        setPending(next);
      }),
    [],
  );

  useEffect(() => {
    registerConfirmHandler(requestConfirm);
    return () => {
      registerConfirmHandler(null);
      pendingRef.current?.resolve(false);
      pendingRef.current = null;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [requestConfirm]);

  function close(confirmed: boolean) {
    if (closing) return;
    const current = pendingRef.current;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      pendingRef.current = null;
      setPending(null);
      setClosing(false);
      current?.resolve(confirmed);
    }, 170);
  }

  const tone = pending?.tone ?? "default";
  const ToneIcon = tone === "destructive"
    ? TrashIcon
    : tone === "warning"
      ? WarningDiamondIcon
      : QuestionIcon;

  return (
    <>
      {children}
      {pending ? (
        <div
          className={`app-confirm-backdrop${closing ? " closing" : ""}`}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(false);
          }}
        >
          <section
            className={`app-confirm-card ${tone}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-confirm-title"
            aria-describedby={pending.message ? "app-confirm-message" : undefined}
          >
            <div className="app-confirm-icon" aria-hidden="true">
              <ToneIcon size={30} weight="duotone" />
            </div>
            <h2 id="app-confirm-title">{pending.title}</h2>
            {pending.message ? <p id="app-confirm-message">{pending.message}</p> : null}
            <div className="app-confirm-actions">
              <button type="button" className="secondary" onClick={() => close(false)}>
                <XIcon size={17} />
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button type="button" className="confirm" onClick={() => close(true)} autoFocus>
                {tone === "destructive" ? <TrashIcon size={17} /> : null}
                {pending.confirmLabel ?? "Continue"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
