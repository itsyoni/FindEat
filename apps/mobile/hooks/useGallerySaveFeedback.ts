import { useCallback, useEffect, useRef, useState } from "react";

export type GallerySaveStatus = "idle" | "saving" | "success";

export function useGallerySaveFeedback() {
  const [status, setStatus] = useState<GallerySaveStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  useEffect(() => clearReset, [clearReset]);

  const begin = useCallback(() => {
    clearReset();
    setStatus("saving");
  }, [clearReset]);

  const succeed = useCallback(() => {
    clearReset();
    setStatus("success");
    resetTimerRef.current = setTimeout(() => setStatus("idle"), 1350);
  }, [clearReset]);

  const fail = useCallback(() => {
    clearReset();
    setStatus("idle");
  }, [clearReset]);

  return {
    status,
    isSaving: status === "saving",
    begin,
    succeed,
    fail,
  };
}
