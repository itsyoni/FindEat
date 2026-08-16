import ActionToast, {
  type ActionToastKind,
} from "@/components/common/feedback/ActionToast";
import * as Haptics from "expo-haptics";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo } from "react-native";

type ToastOptions = {
  kind?: ActionToastKind;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
  hideToast: () => void;
};

type ToastState = {
  id: number;
  message: string;
  kind: ActionToastKind;
  duration: number;
  actionLabel?: string;
  onAction?: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const hideToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    setToast({
      id: ++nextId.current,
      message: trimmedMessage,
      kind: options.kind ?? "success",
      duration: options.duration ?? 2600,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    });
    AccessibilityInfo.announceForAccessibility(trimmedMessage);
    void Haptics.notificationAsync(
      options.kind === "error"
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hideToast, toast.duration);
    return () => clearTimeout(timer);
  }, [hideToast, toast]);

  const value = useMemo(
    () => ({ showToast, hideToast }),
    [hideToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <ActionToast
          key={toast.id}
          message={toast.message}
          kind={toast.kind}
          actionLabel={toast.actionLabel}
          onDismiss={hideToast}
          onAction={
            toast.onAction
              ? () => {
                  hideToast();
                  toast.onAction?.();
                }
              : undefined
          }
        />
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
