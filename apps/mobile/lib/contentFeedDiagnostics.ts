export type ContentFeedDiagnosticMode = "off" | "profile" | "placeholder";

const configuredMode =
  process.env.EXPO_PUBLIC_CONTENT_FEED_DIAGNOSTIC_MODE?.trim().toLowerCase();

export const contentFeedDiagnosticMode: ContentFeedDiagnosticMode =
  __DEV__ && configuredMode === "placeholder"
    ? "placeholder"
    : __DEV__ && configuredMode === "profile"
      ? "profile"
      : "off";

export const contentFeedDiagnosticsEnabled =
  contentFeedDiagnosticMode !== "off";

export function contentFeedPerfNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function logContentFeedPerf(
  event: string,
  details: Record<string, unknown> = {},
) {
  if (!contentFeedDiagnosticsEnabled) return;
  console.info(`[ContentFeedPerf] ${event}`, details);
}
