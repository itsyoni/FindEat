import { useCallback, useEffect, useRef, useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";

export type CustomDropdownOption = {
  value: string;
  label: string;
  meta?: string;
};

export function CustomDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: CustomDropdownOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedValue, setHighlightedValue] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const highlightedValueRef = useRef(value);
  const typeahead = useRef("");
  const typeaheadTimer = useRef<number | null>(null);
  const instanceId = useRef(`custom-dropdown-${crypto.randomUUID()}`);
  const selected = options.find((option) => option.value === value) ?? options[0];

  const selectValue = useCallback((nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
  }, [onChange]);

  function highlight(valueToHighlight: string) {
    highlightedValueRef.current = valueToHighlight;
    setHighlightedValue(valueToHighlight);
    window.requestAnimationFrame(() => {
      [...(dropdownRef.current?.querySelectorAll<HTMLButtonElement>("[data-option-value]") ?? [])]
        .find((button) => button.dataset.optionValue === valueToHighlight)
        ?.scrollIntoView({ block: "nearest" });
    });
  }

  useEffect(
    () => () => {
      if (typeaheadTimer.current !== null) {
        window.clearTimeout(typeaheadTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    const closeWhenAnotherDropdownOpens = (event: Event) => {
      const openerId = (event as CustomEvent<string>).detail;
      if (openerId !== instanceId.current) setIsOpen(false);
    };
    window.addEventListener(
      "findeat:custom-dropdown-open",
      closeWhenAnotherDropdownOpens,
    );
    return () =>
      window.removeEventListener(
        "findeat:custom-dropdown-open",
        closeWhenAnotherDropdownOpens,
      );
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleTypeahead = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        dropdownRef.current
          ?.querySelector<HTMLButtonElement>(".custom-dropdown-trigger")
          ?.focus();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        selectValue(highlightedValueRef.current);
        dropdownRef.current
          ?.querySelector<HTMLButtonElement>(".custom-dropdown-trigger")
          ?.focus();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const currentIndex = Math.max(
          0,
          options.findIndex(
            (option) => option.value === highlightedValueRef.current,
          ),
        );
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = Math.min(
          options.length - 1,
          Math.max(0, currentIndex + direction),
        );
        if (options[nextIndex]) highlight(options[nextIndex].value);
        return;
      }
      if (
        event.key.length !== 1 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        !/[\p{L}\p{N}]/u.test(event.key)
      ) {
        return;
      }

      event.preventDefault();
      typeahead.current += event.key.toLocaleLowerCase();
      if (typeaheadTimer.current !== null) {
        window.clearTimeout(typeaheadTimer.current);
      }
      typeaheadTimer.current = window.setTimeout(() => {
        typeahead.current = "";
      }, 800);
      let match = options.find((option) =>
        `${option.label} ${option.meta ?? ""}`
          .toLocaleLowerCase()
          .startsWith(typeahead.current),
      );
      if (!match) {
        typeahead.current = event.key.toLocaleLowerCase();
        match = options.find((option) =>
          `${option.label} ${option.meta ?? ""}`
            .toLocaleLowerCase()
            .startsWith(typeahead.current),
        );
      }
      if (match) highlight(match.value);
    };
    window.addEventListener("keydown", handleTypeahead);
    return () => window.removeEventListener("keydown", handleTypeahead);
  }, [isOpen, options, selectValue]);

  return (
    <div
      ref={dropdownRef}
      className={`custom-dropdown [position:relative] [min-width:0] [max-width:100%] [color:var(--ink)] [font-size:12px] [font-weight:700] [text-transform:none] [letter-spacing:normal] [&.open]:[z-index:50] [&.open_.custom-dropdown-caret]:[transform:rotate(180deg)] [.pro-range_&]:[width:180px] max-[520px]:[.pro-range_&]:[width:100%] max-[520px]:[&_.custom-dropdown-menu]:[width:min(100%,calc(100vw_-_28px))] max-[520px]:[&_.custom-dropdown-menu]:[min-width:0] ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="custom-dropdown-trigger [display:grid] [grid-template-columns:minmax(0,_1fr)_auto_auto] [align-items:center] [width:100%] [height:48px] [min-width:0] [gap:10px] [padding:0_12px_0_14px] [border:1px_solid_#dcdad5] [border-radius:12px] [background:var(--surface)] [color:var(--ink)] [font:inherit] [text-align:left] [outline:0] [transition:border-color_0.16s_ease,_box-shadow_0.16s_ease] [&:focus]:[border-color:var(--ink)] [&:focus]:[box-shadow:0_0_0_3px_#17171710] dark:[border-color:var(--line)] [.pro-range_&]:[height:44px] [.pro-range_&]:[border-color:var(--line)] [.pro-range_&]:[background:var(--surface)] [.pro-range_&]:[font-size:12px] [.pro-range_&]:[font-weight:750]"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }
          highlight(value);
          window.dispatchEvent(
            new CustomEvent("findeat:custom-dropdown-open", {
              detail: instanceId.current,
            }),
          );
          setIsOpen(true);
        }}
      >
        <span className="custom-dropdown-label [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap]">{selected?.label}</span>
        {selected?.meta ? (
          <span className="custom-dropdown-meta [overflow:hidden] [text-overflow:ellipsis] [white-space:nowrap] [color:var(--muted)] [font-size:10px] [font-weight:800] [text-align:right]">{selected.meta}</span>
        ) : null}
        <CaretDownIcon
          aria-hidden="true"
          className="custom-dropdown-caret [color:var(--muted)] [transition:transform_0.16s_ease]"
          size={14}
          weight="bold"
        />
      </button>
      {isOpen ? (
        <div className="custom-dropdown-menu [position:absolute] [z-index:60] [top:calc(100%_+_6px)] [left:0] [width:max(100%,_190px)] [max-height:280px] [overflow:auto] [padding:6px] [border:1px_solid_var(--line)] [border-radius:14px] [background:var(--surface)] [box-shadow:0_16px_38px_rgba(23,_18,_13,_0.18)] [&>button]:[display:flex] [&>button]:[align-items:center] [&>button]:[justify-content:space-between] [&>button]:[width:100%] [&>button]:[min-height:40px] [&>button]:[gap:12px] [&>button]:[padding:9px_10px] [&>button]:[border:0] [&>button]:[border-radius:9px] [&>button]:[background:transparent] [&>button]:[color:var(--ink)] [&>button]:[font:inherit] [&>button]:[font-size:11px] [&>button]:[text-align:left] [&>button>span]:[overflow:hidden] [&>button>span]:[text-overflow:ellipsis] [&>button>span]:[white-space:nowrap] [&>button>span:last-child:not(:first-child)]:[color:var(--muted)] [&>button>span:last-child:not(:first-child)]:[font-size:10px] [&>button>span:last-child:not(:first-child)]:[text-align:right] [&>button:hover]:[background:var(--surface-hover)] [&>button:hover]:[outline:0] [&>button:focus-visible]:[background:var(--surface-hover)] [&>button:focus-visible]:[outline:0] [&>button.highlighted]:[background:var(--surface-hover)] [&>button.highlighted]:[outline:0] [&>button.selected]:[background:var(--soft)] [&>button.selected]:[font-weight:900] [&>button.selected.highlighted]:[box-shadow:inset_0_0_0_1px_var(--line)] [.pro-range_&]:[width:100%] [.pro-range_&]:[min-width:100%]" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              type="button"
              className={`${option.value === value ? "selected" : ""} ${option.value === highlightedValue ? "highlighted" : ""}`}
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              data-option-value={option.value}
              onFocus={() => highlight(option.value)}
              onMouseEnter={() => highlight(option.value)}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                selectValue(option.value);
              }}
            >
              <span>{option.label}</span>
              {option.meta ? <span>{option.meta}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
