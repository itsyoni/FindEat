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
      className={`custom-dropdown ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="custom-dropdown-trigger"
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
        <span className="custom-dropdown-label">{selected?.label}</span>
        {selected?.meta ? (
          <span className="custom-dropdown-meta">{selected.meta}</span>
        ) : null}
        <CaretDownIcon
          aria-hidden="true"
          className="custom-dropdown-caret"
          size={14}
          weight="bold"
        />
      </button>
      {isOpen ? (
        <div className="custom-dropdown-menu" role="listbox" aria-label={ariaLabel}>
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
