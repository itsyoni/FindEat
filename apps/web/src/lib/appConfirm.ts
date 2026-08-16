export type ConfirmTone = "default" | "destructive" | "warning";

export type ConfirmRequest = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmHandler = (request: ConfirmRequest) => Promise<boolean>;

let handler: ConfirmHandler | null = null;

export function registerConfirmHandler(next: ConfirmHandler | null) {
  handler = next;
}

export function confirmAction(request: ConfirmRequest) {
  if (handler) return handler(request);
  return Promise.resolve(window.confirm(request.message ?? request.title));
}
