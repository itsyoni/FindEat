export type MediaSuspensionController = {
  getSnapshot: () => boolean;
  subscribe: (listener: () => void) => () => void;
  setSuspended: (suspended: boolean) => void;
};

export function createMediaSuspensionController(): MediaSuspensionController {
  let suspended = false;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => suspended,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setSuspended: (nextSuspended) => {
      if (suspended === nextSuspended) return;
      suspended = nextSuspended;
      listeners.forEach((listener) => listener());
    },
  };
}
