export type PromptRequest = {
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type PromptHandler = (request: PromptRequest) => Promise<string | null>;

let handler: PromptHandler | null = null;

export function registerPromptHandler(next: PromptHandler | null) {
  handler = next;
}

export function promptAction(request: PromptRequest) {
  if (handler) return handler(request);
  return Promise.resolve(window.prompt(request.message ?? request.title, request.initialValue));
}
