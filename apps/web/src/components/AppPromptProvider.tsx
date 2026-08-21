import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { registerPromptHandler, type PromptRequest } from "../lib/appPrompt";

type PendingPrompt = PromptRequest & {
  resolve: (value: string | null) => void;
};

export function AppPromptProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const [value, setValue] = useState("");
  const [closing, setClosing] = useState(false);
  const pendingRef = useRef<PendingPrompt | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestPrompt = useCallback(
    (request: PromptRequest) =>
      new Promise<string | null>((resolve) => {
        const next = { ...request, resolve };
        pendingRef.current?.resolve(null);
        pendingRef.current = next;
        setClosing(false);
        setValue(request.initialValue ?? "");
        setPending(next);
      }),
    [],
  );

  useEffect(() => {
    registerPromptHandler(requestPrompt);
    return () => {
      registerPromptHandler(null);
      pendingRef.current?.resolve(null);
      pendingRef.current = null;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [requestPrompt]);

  function close(result: string | null) {
    if (closing) return;
    const current = pendingRef.current;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      pendingRef.current = null;
      setPending(null);
      setClosing(false);
      current?.resolve(result);
    }, 170);
  }

  return (
    <>
      {children}
      {pending ? (
        <div
          className={`fixed inset-0 z-3000 grid place-items-center bg-[rgba(24,22,18,0.62)] p-5 backdrop-blur-[7px] max-[480px]:items-end max-[480px]:p-3 ${closing ? "pointer-events-none animate-[confirm-fade-out_.17s_ease-in_forwards]" : "animate-[confirm-fade_.16s_ease-out]"}`}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(null);
          }}
        >
          <form
            className={`w-full max-w-97.5 rounded-[30px] border border-line bg-surface p-6 text-center shadow-[0_30px_90px_rgba(20,18,14,0.32)] max-[480px]:rounded-[28px] ${closing ? "animate-[confirm-leave_.17s_ease-in_forwards]" : "animate-[confirm-enter_.2s_cubic-bezier(0.2,0.9,0.25,1.08)]"}`}
            role="dialog"
            aria-modal="true"
            onSubmit={(event) => {
              event.preventDefault();
              close(value);
            }}
          >
            <div className="mx-auto mb-3.75 grid size-14.5 place-items-center rounded-full bg-[#f3e7ce] text-[#d97706] dark:bg-warning-soft dark:text-warning" aria-hidden="true">
              <PencilSimpleIcon size={29} weight="duotone" />
            </div>
            <h2 className="m-0 text-[23px] tracking-[-0.025em] text-ink">{pending.title}</h2>
            {pending.message ? <p className="mx-auto mt-2.25 max-w-[32ch] leading-[1.55] text-muted">{pending.message}</p> : null}
            <input
              className="mt-5 min-h-13 w-full rounded-2xl border border-line bg-soft px-3.75 text-ink outline-none focus:border-[#d97706] focus:shadow-[0_0_0_3px_rgba(217,119,6,0.14)]"
              autoFocus
              value={value}
              placeholder={pending.placeholder}
              onChange={(event) => setValue(event.target.value)}
            />
            <div className="mt-5.5 grid grid-cols-2 gap-2.25 max-[480px]:grid-cols-1">
              <button type="button" className="flex min-h-12 items-center justify-center gap-1.75 rounded-2xl border-0 bg-soft font-extrabold text-ink" onClick={() => close(null)}>
                <XIcon size={17} />
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button type="submit" className="flex min-h-12 items-center justify-center rounded-2xl border-0 bg-[#2b2926] font-extrabold text-[#f5f2ec]">
                {pending.confirmLabel ?? "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
