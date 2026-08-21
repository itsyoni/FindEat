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
  const toneIconClass = tone === "destructive"
    ? "bg-[#fbe7e5] text-[#d64a42] dark:bg-danger-soft dark:text-danger"
    : tone === "warning"
      ? "bg-[#fff0d4] text-[#d97706] dark:bg-warning-soft dark:text-warning"
      : "bg-[#f3e7ce] text-[#d97706] dark:bg-warning-soft dark:text-warning";
  const confirmClass = tone === "destructive"
    ? "bg-[#d64a42]"
    : tone === "warning"
      ? "bg-[#d97706]"
      : "bg-[#2b2926]";

  return (
    <>
      {children}
      {pending ? (
        <div
          className={`fixed inset-0 z-3000 grid place-items-center bg-[rgba(24,22,18,0.62)] p-5 backdrop-blur-[7px] max-[480px]:items-end max-[480px]:p-3 ${closing ? "pointer-events-none animate-[confirm-fade-out_.17s_ease-in_forwards]" : "animate-[confirm-fade_.16s_ease-out]"}`}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(false);
          }}
        >
          <section
            className={`w-full max-w-97.5 rounded-[30px] border border-line bg-surface p-6 text-center shadow-[0_30px_90px_rgba(20,18,14,0.32)] max-[480px]:rounded-[28px] ${closing ? "animate-[confirm-leave_.17s_ease-in_forwards]" : "animate-[confirm-enter_.2s_cubic-bezier(0.2,0.9,0.25,1.08)]"}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-confirm-title"
            aria-describedby={pending.message ? "app-confirm-message" : undefined}
          >
            <div className={`mx-auto mb-3.75 grid size-14.5 place-items-center rounded-full ${toneIconClass}`} aria-hidden="true">
              <ToneIcon size={30} weight="duotone" />
            </div>
            <h2 className="m-0 text-[23px] tracking-[-0.025em] text-ink" id="app-confirm-title">{pending.title}</h2>
            {pending.message ? <p className="mx-auto mt-2.25 max-w-[32ch] leading-[1.55] text-muted" id="app-confirm-message">{pending.message}</p> : null}
            <div className="mt-5.5 grid grid-cols-2 gap-2.25 max-[480px]:grid-cols-1">
              <button type="button" className="flex min-h-12 items-center justify-center gap-1.75 rounded-2xl border-0 bg-soft font-extrabold text-ink" onClick={() => close(false)}>
                <XIcon size={17} />
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button type="button" className={`flex min-h-12 items-center justify-center gap-1.75 rounded-2xl border-0 font-extrabold text-[#f5f2ec] ${confirmClass}`} onClick={() => close(true)} autoFocus>
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
