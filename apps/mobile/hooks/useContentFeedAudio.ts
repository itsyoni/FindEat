import { useSyncExternalStore } from "react";

let contentFeedMuted = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return contentFeedMuted;
}

export function setContentFeedMuted(muted: boolean) {
  if (contentFeedMuted === muted) return;
  contentFeedMuted = muted;
  listeners.forEach((listener) => listener());
}

export function useContentFeedAudio() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
