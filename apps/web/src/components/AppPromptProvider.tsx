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
          className={`app-confirm-backdrop${closing ? " closing" : ""}`}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(null);
          }}
        >
          <form
            className="app-confirm-card app-prompt-card"
            role="dialog"
            aria-modal="true"
            onSubmit={(event) => {
              event.preventDefault();
              close(value);
            }}
          >
            <div className="app-confirm-icon" aria-hidden="true">
              <PencilSimpleIcon size={29} weight="duotone" />
            </div>
            <h2>{pending.title}</h2>
            {pending.message ? <p>{pending.message}</p> : null}
            <input
              autoFocus
              value={value}
              placeholder={pending.placeholder}
              onChange={(event) => setValue(event.target.value)}
            />
            <div className="app-confirm-actions">
              <button type="button" className="secondary" onClick={() => close(null)}>
                <XIcon size={17} />
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button type="submit" className="confirm">
                {pending.confirmLabel ?? "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
