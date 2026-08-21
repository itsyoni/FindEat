import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";

export function SidebarNavGroup({
  id,
  label,
  icon,
  active = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(active);
  const open = controlledOpen ?? internalOpen;
  const navigationChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;

    const element = child as ReactElement<{ children?: ReactNode }>;
    const parts = Children.toArray(element.props.children);
    if (parts.length < 2) return child;

    const leadingIcon = parts[0];
    const possibleCounter = parts.at(-1);
    const hasCounter =
      isValidElement(possibleCounter) && possibleCounter.type === "small";
    const labelParts = parts.slice(1, hasCounter ? -1 : undefined);

    return cloneElement(
      element,
      undefined,
      leadingIcon,
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {labelParts}
      </span>,
      hasCounter ? possibleCounter : null,
    );
  });

  useEffect(() => {
    if (!active || controlledOpen !== undefined) return;
    // Keep the current page visible when navigation changes outside the sidebar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInternalOpen(true);
  }, [active, controlledOpen]);

  return (
    <div className="min-w-0 max-[800px]:col-span-full" data-sidebar-group>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className="flex min-h-11 w-full items-center gap-3.25 rounded-xl border-0 bg-transparent p-3 text-left text-sm font-normal text-[#faf9f6] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [@media(hover:hover)]:hover:translate-x-0.75 [@media(hover:hover)]:hover:bg-[#ffffff1a]"
        onClick={(event) => {
          event.stopPropagation();
          const nextOpen = !open;
          if (onOpenChange) {
            onOpenChange(nextOpen);
          } else {
            setInternalOpen(nextOpen);
          }
        }}
      >
        <span className="grid size-5 shrink-0 place-items-center" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate whitespace-nowrap" data-sidebar-group-label>{label}</span>
        <CaretDownIcon
          className={`size-4 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
          weight="bold"
          aria-hidden="true"
          data-sidebar-group-caret
        />
      </button>
      <div
        id={id}
        data-sidebar-group-content
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          open
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="ml-4 grid gap-1 border-l border-[#faf9f64d] py-1 pl-2 [&>a]:flex [&>a]:min-h-10 [&>a]:w-full [&>a]:items-center [&>a]:gap-3 [&>a]:overflow-hidden [&>a]:text-ellipsis [&>a]:whitespace-nowrap [&>a]:rounded-xl [&>a]:border-0 [&>a]:bg-transparent [&>a]:px-3 [&>a]:py-2 [&>a]:text-left [&>a]:text-[13px] [&>a]:font-normal [&>a]:text-[#faf9f6] [&>a]:no-underline [&>a]:transition [&>button]:flex [&>button]:min-h-10 [&>button]:w-full [&>button]:items-center [&>button]:gap-3 [&>button]:overflow-hidden [&>button]:text-ellipsis [&>button]:whitespace-nowrap [&>button]:rounded-xl [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-3 [&>button]:py-2 [&>button]:text-left [&>button]:text-[13px] [&>button]:font-normal [&>button]:text-[#faf9f6] [&>button]:transition [&>.active]:bg-[#ffffff22] [&>.active]:font-bold [&>.active]:tracking-[-0.012em] [&>.active]:text-[#faf9f6] [@media(hover:hover)]:[&>a:hover]:bg-[#ffffff1a] [@media(hover:hover)]:[&>a:hover]:text-[#faf9f6] [@media(hover:hover)]:[&>button:hover]:bg-[#ffffff1a] [@media(hover:hover)]:[&>button:hover]:text-[#faf9f6] max-[800px]:ml-2">
            {navigationChildren}
          </div>
        </div>
      </div>
    </div>
  );
}
