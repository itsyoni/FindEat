import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const MIN_SIDEBAR_WIDTH = 230;
const MAX_SIDEBAR_WIDTH = 390;
const DEFAULT_SIDEBAR_WIDTH = 260;
const COMPACT_SIDEBAR_WIDTH = 76;

export function useResizableSidebar(storageKey: string) {
  const sidebarRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(true);
  const [resizing, setResizing] = useState(false);
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
    const storedWidth = Number(window.localStorage.getItem(storageKey));
    if (!Number.isFinite(storedWidth)) return DEFAULT_SIDEBAR_WIDTH;
    return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, storedWidth));
  });

  useEffect(() => {
    const sidebar = sidebarRef.current;
    const layout = sidebar?.parentElement;
    if (!sidebar || !layout) return;

    const desktop = window.matchMedia("(min-width: 801px)");
    layout.style.transition = resizing
      ? "none"
      : "grid-template-columns 220ms cubic-bezier(0.22, 1, 0.36, 1)";
    const syncLayout = () => {
      if (!desktop.matches) {
        layout.style.removeProperty("grid-template-columns");
        return;
      }
      layout.style.gridTemplateColumns = `${open ? width : COMPACT_SIDEBAR_WIDTH}px minmax(0, 1fr)`;
    };

    syncLayout();
    desktop.addEventListener("change", syncLayout);
    window.localStorage.setItem(storageKey, String(width));
    return () => {
      desktop.removeEventListener("change", syncLayout);
      layout.style.removeProperty("grid-template-columns");
      layout.style.removeProperty("transition");
    };
  }, [open, resizing, storageKey, width]);

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const layout = sidebarRef.current?.parentElement;
      if (!layout) return;

      event.preventDefault();
      const left = layout.getBoundingClientRect().left;
      const previousCursor = document.body.style.cursor;
      const previousSelection = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      setResizing(true);

      const resize = (pointerEvent: PointerEvent) => {
        const nextWidth = Math.min(
          MAX_SIDEBAR_WIDTH,
          Math.max(MIN_SIDEBAR_WIDTH, pointerEvent.clientX - left),
        );
        setWidth(Math.round(nextWidth));
      };

      const stop = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelection;
        setResizing(false);
        window.removeEventListener("pointermove", resize);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      };

      window.addEventListener("pointermove", resize);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    },
    [],
  );

  return { sidebarRef, open, setOpen, width, startResize };
}
