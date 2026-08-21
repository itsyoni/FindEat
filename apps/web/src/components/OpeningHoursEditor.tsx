import { useEffect, useState } from "react";
import {
  RESTAURANT_WEEKDAYS,
  type Menu,
  type RestaurantHappyHourPeriod,
  type RestaurantOpeningHours,
  type RestaurantOpeningPeriod,
  type RestaurantOpeningTime,
  type RestaurantWeekday,
} from "@findeat/types";
import { CheersIcon } from "@phosphor-icons/react/dist/csr/Cheers";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { CopyIcon } from "@phosphor-icons/react/dist/csr/Copy";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { createEmptyOpeningHours } from "./openingHours";
import {
  CustomDropdown,
  type CustomDropdownOption,
} from "./CustomDropdown";

const dayLabels: Record<RestaurantWeekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const fallbackTimezones = [
  "UTC",
  "Asia/Jerusalem",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Athens",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const availableTimezones = (() => {
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    };
    return intl.supportedValuesOf?.("timeZone") ?? fallbackTimezones;
  } catch {
    return fallbackTimezones;
  }
})();

const timezoneCityLabel = (timezone: string) => {
  if (timezone === "UTC" || timezone === "Etc/UTC") return "UTC";
  return (timezone.split("/").at(-1) ?? timezone).replaceAll("_", " ");
};

const timezoneLocalTimeLabel = (timezone: string, timestamp: number) => {
  try {
    return new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(timestamp));
  } catch {
    return "--:--";
  }
};

function DishTargetPicker({
  menus,
  selectedIds,
  onChange,
}: {
  menus: Menu[];
  selectedIds: string[];
  onChange: (dishIds: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleMenus = menus
    .map((menu) => ({
      ...menu,
      items: menu.items.filter((dish) =>
        `${dish.name} ${menu.title}`.toLocaleLowerCase().includes(normalizedQuery),
      ),
    }))
    .filter((menu) => menu.items.length > 0);

  return (
    <div className={`happy-dish-picker [grid-column:1/-1] [min-width:0] [margin-top:3px] [border:1px_solid_var(--line)] [border-radius:12px] [background:var(--surface)] [&.required]:[border-color:var(--warning-border)] [&:has(.happy-dish-picker-panel)_.happy-dish-picker-trigger>svg]:[transform:rotate(180deg)] ${selectedIds.length === 0 ? "required" : ""}`}>
      <button
        type="button"
        className="happy-dish-picker-trigger [display:flex] [align-items:center] [justify-content:space-between] [width:100%] [min-height:52px] [gap:12px] [padding:9px_12px] [border:0] [border-radius:inherit] [background:transparent] [color:var(--ink)] [text-align:left] [&>span]:[display:grid] [&>span]:[gap:2px] [&_strong]:[font-size:11px] [&_small]:[color:var(--muted)] [&_small]:[font-size:10px] [&>svg]:[color:var(--muted)] [&>svg]:[transition:transform_0.16s_ease]"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          <strong>Specific dishes</strong>
          <small>
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : "Select at least one dish"}
          </small>
        </span>
        <CaretDownIcon size={15} weight="bold" />
      </button>
      {isOpen ? (
        <div className="happy-dish-picker-panel [display:grid] [gap:9px] [padding:0_10px_10px] [border-top:1px_solid_var(--line)] [&>input]:[height:42px] [&>input]:[margin-top:10px] [&>input]:[background:var(--soft)] [.happy-dish-picker:has(&)_.happy-dish-picker-trigger>svg]:[transform:rotate(180deg)] [display:grid] [gap:9px] [padding:0_10px_10px] [border-top:1px_solid_var(--line)] [&>input]:[height:42px] [&>input]:[margin-top:10px] [&>input]:[background:var(--soft)]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search dishes"
            autoFocus
          />
          <div className="happy-dish-options [display:grid] [max-height:310px] [overflow:auto] [gap:10px] [padding-right:3px] [&>section]:[display:grid] [&>section]:[gap:4px] [&>section>header]:[display:flex] [&>section>header]:[align-items:center] [&>section>header]:[justify-content:space-between] [&>section>header]:[padding:3px_4px] [&>section>header]:[color:var(--muted)] [&>section>header]:[font-size:10px] [&>section>header_span]:[display:grid] [&>section>header_span]:[min-width:20px] [&>section>header_span]:[height:20px] [&>section>header_span]:[place-items:center] [&>section>header_span]:[border-radius:999px] [&>section>header_span]:[background:var(--soft)] [&>section>header_span]:[font-size:9px] [&>section>button]:[display:grid] [&>section>button]:[grid-template-columns:34px_minmax(0,_1fr)_24px] [&>section>button]:[align-items:center] [&>section>button]:[gap:9px] [&>section>button]:[width:100%] [&>section>button]:[min-height:44px] [&>section>button]:[padding:5px_7px] [&>section>button]:[border:0] [&>section>button]:[border-radius:10px] [&>section>button]:[background:transparent] [&>section>button]:[color:var(--ink)] [&>section>button]:[font-size:11px] [&>section>button]:[text-align:left] [&>section>button:hover]:[background:var(--surface-hover)] [&>section>button.selected]:[background:var(--warning-soft)] [&_img]:[display:grid] [&_img]:[width:34px] [&_img]:[height:34px] [&_img]:[place-items:center] [&_img]:[border-radius:8px] [&_img]:[background:var(--soft)] [&_img]:[object-fit:cover] [&_img]:[color:var(--muted)] [&_img]:[font-size:11px] [&_img]:[font-weight:900] [&>section>button.selected_.happy-dish-check]:[border-color:var(--warning-border)] [&>section>button.selected_.happy-dish-check]:[background:var(--warning-soft)] [&>p]:[margin:6px] [&>p]:[color:var(--muted)] [&>p]:[font-size:11px] [&>p]:[text-align:center]" role="listbox" aria-multiselectable="true">
            {visibleMenus.map((menu) => (
              <section key={menu.id}>
                <header className="flex h-19 items-center justify-between border-b border-line bg-surface px-10.5 [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 max-[800px]:px-5">
                  <strong>{menu.title}</strong>
                  <span>{menu.items.length}</span>
                </header>
                {menu.items.map((dish) => {
                  const selected = selectedIds.includes(dish.id);
                  return (
                    <button
                      type="button"
                      className={selected ? "selected" : ""}
                      key={dish.id}
                      role="option"
                      aria-selected={selected}
                      onClick={() =>
                        onChange(
                          selected
                            ? selectedIds.filter((id) => id !== dish.id)
                            : [...selectedIds, dish.id].slice(0, 100),
                        )
                      }
                    >
                      {dish.thumbnailUrl || dish.imageUrl ? (
                        <img src={dish.thumbnailUrl || dish.imageUrl || ""} alt="" />
                      ) : (
                        <span className="happy-dish-fallback [display:grid] [width:34px] [height:34px] [place-items:center] [border-radius:8px] [background:var(--soft)] [object-fit:cover] [color:var(--muted)] [font-size:11px] [font-weight:900]">
                          {dish.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>{dish.name}</span>
                      <span className="happy-dish-check [display:grid] [width:20px] [height:20px] [place-items:center] [border:1px_solid_var(--line)] [border-radius:7px] [color:var(--warning)]">
                        {selected ? <CheckIcon size={13} weight="bold" /> : null}
                      </span>
                    </button>
                  );
                })}
              </section>
            ))}
            {visibleMenus.length === 0 ? (
              <p>No dishes match your search.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const clonePeriods = <T,>(periods: T[]) =>
  periods.map((period) => structuredClone(period));

function OpeningTimeField({
  label,
  day,
  field,
  value,
  onChange,
}: {
  label: string;
  day: RestaurantWeekday;
  field: "open" | "close";
  value: RestaurantOpeningTime;
  onChange: (value: RestaurantOpeningTime) => void;
}) {
  const supportsShabbatTime =
    (day === "FRIDAY" && field === "close") ||
    (day === "SATURDAY" && field === "open");
  const rawMode = typeof value === "string" ? "FIXED" : value.type;
  const mode =
    (rawMode === "SHABBAT_ENTRY" && !(day === "FRIDAY" && field === "close")) ||
    (rawMode === "SHABBAT_END" && !(day === "SATURDAY" && field === "open"))
      ? "FIXED"
      : rawMode;
  const fixedTime =
    typeof value === "string"
      ? value
      : value.type === "FIXED"
        ? value.time
        : "09:00";
  const offset =
    typeof value === "object" && value.type !== "FIXED"
      ? value.offsetMinutes
      : 0;

  if (!supportsShabbatTime) {
    return (
      <label className="schedule-time-field [display:grid] [min-width:0] [gap:5px] [&>span]:[color:var(--muted)] [&>span]:[font-size:9px] [&>span]:[font-weight:900] [&>span]:[text-transform:uppercase] [&>span]:[letter-spacing:.05em] [&>input]:[height:48px]">
        <span>{label}</span>
        <input
          aria-label={`${label} time`}
          type="time"
          value={fixedTime}
          onChange={(event) => onChange(event.target.value)}
          required
        />
      </label>
    );
  }

  return (
    <div className="schedule-time-field [display:grid] [min-width:0] [gap:5px] [&>span]:[color:var(--muted)] [&>span]:[font-size:9px] [&>span]:[font-weight:900] [&>span]:[text-transform:uppercase] [&>span]:[letter-spacing:.05em] [&>input]:[height:48px]">
      <span>{label}</span>
      <div className="schedule-time-control [display:grid] [grid-template-columns:minmax(92px,.8fr)_minmax(90px,1fr)] [gap:6px] [min-width:0] [&_input]:[box-sizing:border-box] [&_input]:[width:100%] [&_input]:[min-width:0] [&_input]:[max-width:100%] [&_input]:[height:40px] [&_input]:[height:48px] [&_.schedule-offset-input]:[height:48px] [&_.schedule-offset-input_input]:[height:46px] max-[1050px]:[grid-template-columns:1fr]">
        <CustomDropdown
          ariaLabel={`${label} time type`}
          value={mode}
          options={[
            { value: "FIXED", label: "Time" },
            ...(day === "FRIDAY" && field === "close"
              ? [{ value: "SHABBAT_ENTRY", label: "Shabbat entry" }]
              : []),
            ...(day === "SATURDAY" && field === "open"
              ? [{ value: "SHABBAT_END", label: "Shabbat end" }]
              : []),
          ]}
          onChange={(nextMode) =>
            onChange(
              nextMode === "FIXED"
                ? fixedTime
                : {
                    type: nextMode as "SHABBAT_ENTRY" | "SHABBAT_END",
                    offsetMinutes: 0,
                  },
            )
          }
        />
        {mode === "FIXED" ? (
          <input
            aria-label={`${label} time`}
            type="time"
            value={fixedTime}
            onChange={(event) => onChange(event.target.value)}
            required
          />
        ) : (
          <span className="schedule-offset-input [display:grid] [grid-template-columns:minmax(0,1fr)_auto] [align-items:center] [min-width:0] [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:10px] [background:var(--surface)] [&_input]:[height:38px] [&_input]:[border:0] [&_input]:[background:transparent] [&>span]:[padding-right:9px] [&>span]:[color:var(--muted)] [&>span]:[font-size:10px] [&>span]:[font-weight:800]">
            <input
              aria-label={`${label} offset in minutes`}
              type="number"
              min={-180}
              max={180}
              value={offset}
              onChange={(event) =>
                onChange({
                  type: mode as "SHABBAT_ENTRY" | "SHABBAT_END",
                  offsetMinutes: Number(event.target.value),
                })
              }
            />
            <span>min</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function OpeningHoursEditor({
  value,
  menus,
  onChange,
}: {
  value: RestaurantOpeningHours | null;
  menus: Menu[];
  onChange: (value: RestaurantOpeningHours | null) => void;
}) {
  const [activePanel, setActivePanel] = useState<"REGULAR" | "HAPPY">(
    "REGULAR",
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!value) {
    return (
      <section className="opening-hours-editor [min-width:0] [margin:0] [padding:20px] [border:1px_solid_var(--line)] [border-radius:18px] [&_legend]:[display:flex] [&_legend]:[align-items:center] [&_legend]:[gap:8px] [&_legend]:[padding:0_7px] [&_legend]:[font-size:14px] [&_legend]:[font-weight:900] [overflow:visible] [padding:0] [background:var(--surface)] [&.opening-hours-empty]:[display:grid] [&.opening-hours-empty]:[grid-template-columns:auto_minmax(0,_1fr)_auto] [&.opening-hours-empty]:[align-items:center] [&.opening-hours-empty]:[gap:14px] [&.opening-hours-empty]:[padding:20px] max-[700px]:[&.opening-hours-empty]:[grid-template-columns:auto_minmax(0,_1fr)] max-[800px]:[padding:15px] opening-hours-empty [display:flex] [align-items:center] [justify-content:space-between] [gap:20px] [&_p]:[margin:5px_0_0] max-[700px]:[align-items:stretch] max-[700px]:[flex-direction:column] [&>div:nth-child(2)]:[min-width:0] [&_strong]:[font-size:15px] max-[700px]:[&>button]:[grid-column:1/-1] max-[700px]:[&>button]:[width:100%] full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
        <div className="schedule-empty-icon [display:grid] [flex:0_0_auto] [width:46px] [height:46px] [place-items:center] [border-radius:15px] [background:#fff2c7] [color:#9a6800]">
          <ClockIcon size={24} weight="duotone" />
        </div>
        <div>
          <strong>Set your opening hours</strong>
          <p className="muted [.login-card>&]:[line-height:1.55] [color:var(--muted)] max-[650px]:[.messages-heading_&]:[display:none] max-[800px]:[.support-admin-content_.support-heading_&]:[display:none]">
            Help guests know when you are open and promote Happy Hour offers.
          </p>
        </div>
        <button
          type="button"
          className="secondary [border:0] [border-radius:12px] [padding:12px_17px] [font-weight:800] [background:var(--soft)] [color:var(--ink)] [border:1px_solid_var(--line)] [.error-page-actions_&:hover]:[background:var(--surface-hover)] [.error-page-actions_&:hover]:[transform:translateY(-1px)]"
          onClick={() => onChange(createEmptyOpeningHours())}
        >
          Add schedule
        </button>
      </section>
    );
  }

  const openingHours = value;
  const happyHours =
    openingHours.happyHours ?? createEmptyOpeningHours().happyHours!;
  const firstDayOfWeek = openingHours.firstDayOfWeek ?? "SUNDAY";
  const firstDayIndex = RESTAURANT_WEEKDAYS.indexOf(firstDayOfWeek);
  const orderedDays = [
    ...RESTAURANT_WEEKDAYS.slice(firstDayIndex),
    ...RESTAURANT_WEEKDAYS.slice(0, firstDayIndex),
  ];
  const dishCount = menus.reduce((count, menu) => count + menu.items.length, 0);
  const foodSectionCount = menus.filter(
    (menu) => menu.sectionType !== "DRINKS",
  ).length;
  const drinksSectionCount = menus.filter(
    (menu) => menu.sectionType === "DRINKS",
  ).length;
  const happyHourTargetOptions: CustomDropdownOption[] = [
    { value: "ALL_MENU", label: "Entire menu" },
    { value: "FOOD", label: "All food", meta: `${foodSectionCount} sections` },
    { value: "DRINKS", label: "All drinks", meta: `${drinksSectionCount} sections` },
    ...menus.map((menu) => ({
      value: `SECTION:${menu.id}`,
      label: menu.title,
      meta: `${menu.sectionType === "DRINKS" ? "Drinks" : "Food"} · ${menu.items.length} item${menu.items.length === 1 ? "" : "s"}`,
    })),
    ...(dishCount > 0
      ? [{ value: "DISHES", label: "Specific dishes", meta: `${dishCount} available` }]
      : []),
  ];
  const regularPeriodCount = RESTAURANT_WEEKDAYS.reduce(
    (count, day) => count + openingHours.weekly[day].length,
    0,
  );
  const happyPeriodCount = RESTAURANT_WEEKDAYS.reduce(
    (count, day) => count + happyHours[day].length,
    0,
  );

  function setPeriods(
    day: RestaurantWeekday,
    periods: RestaurantOpeningPeriod[],
  ) {
    onChange({
      ...openingHours,
      weekly: { ...openingHours.weekly, [day]: periods },
    });
  }

  function updatePeriod(
    day: RestaurantWeekday,
    index: number,
    patch: Partial<RestaurantOpeningPeriod>,
  ) {
    setPeriods(
      day,
      openingHours.weekly[day].map((period, periodIndex) =>
        periodIndex === index ? { ...period, ...patch } : period,
      ),
    );
  }

  function setHappyHours(
    day: RestaurantWeekday,
    periods: RestaurantHappyHourPeriod[],
  ) {
    onChange({
      ...openingHours,
      happyHours: { ...happyHours, [day]: periods },
    });
  }

  function updateHappyHour(
    day: RestaurantWeekday,
    index: number,
    patch: Partial<RestaurantHappyHourPeriod>,
  ) {
    setHappyHours(
      day,
      happyHours[day].map((period, periodIndex) =>
        periodIndex === index ? { ...period, ...patch } : period,
      ),
    );
  }

  function copyFirstDaySchedule() {
    if (activePanel === "REGULAR") {
      const sourcePeriods = openingHours.weekly[firstDayOfWeek];
      onChange({
        ...openingHours,
        weekly: Object.fromEntries(
          RESTAURANT_WEEKDAYS.map((day) => [day, clonePeriods(sourcePeriods)]),
        ) as RestaurantOpeningHours["weekly"],
      });
      return;
    }
    const sourcePeriods = happyHours[firstDayOfWeek];
    onChange({
      ...openingHours,
      happyHours: Object.fromEntries(
        RESTAURANT_WEEKDAYS.map((day) => [day, clonePeriods(sourcePeriods)]),
      ) as NonNullable<RestaurantOpeningHours["happyHours"]>,
    });
  }

  const firstDayHasSchedule =
    activePanel === "REGULAR"
      ? openingHours.weekly[firstDayOfWeek].length > 0
      : happyHours[firstDayOfWeek].length > 0;

  return (
    <section className="opening-hours-editor [min-width:0] [margin:0] [padding:20px] [border:1px_solid_var(--line)] [border-radius:18px] [&_legend]:[display:flex] [&_legend]:[align-items:center] [&_legend]:[gap:8px] [&_legend]:[padding:0_7px] [&_legend]:[font-size:14px] [&_legend]:[font-weight:900] [overflow:visible] [padding:0] [background:var(--surface)] [&.opening-hours-empty]:[display:grid] [&.opening-hours-empty]:[grid-template-columns:auto_minmax(0,_1fr)_auto] [&.opening-hours-empty]:[align-items:center] [&.opening-hours-empty]:[gap:14px] [&.opening-hours-empty]:[padding:20px] max-[700px]:[&.opening-hours-empty]:[grid-template-columns:auto_minmax(0,_1fr)] max-[800px]:[padding:15px] full [.dish-editor-fields_&]:[grid-column:1/-1] [.profile-form_&]:[grid-column:1/-1] max-[800px]:[.profile-form_&]:[grid-column:auto] max-[650px]:[.dish-editor-fields_&]:[grid-column:auto] [.update-editor-grid_&]:[grid-column:1/-1] max-[800px]:[.update-editor-grid_&]:[grid-column:auto]">
      <header className="schedule-editor-header flex h-19 items-center justify-between border-b border-line bg-surface px-10.5 [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 max-[800px]:px-5 [display:flex] [align-items:center] [justify-content:space-between] [gap:24px] [padding:20px] [border-bottom:1px_solid_var(--line)] max-[700px]:[align-items:stretch] max-[700px]:[flex-direction:column]">
        <div className="schedule-editor-title [display:flex] [align-items:center] [min-width:0] [gap:13px] [&_h3]:[margin:0] [&_p]:[margin:0] [&_h3]:[font-size:18px] [&_p]:[margin-top:3px] [&_p]:[color:var(--muted)] [&_p]:[font-size:12px]">
          <div className="schedule-editor-icon [display:grid] [flex:0_0_auto] [width:46px] [height:46px] [place-items:center] [border-radius:15px] [background:#fff2c7] [color:#9a6800]">
            <ClockIcon size={23} weight="duotone" />
          </div>
          <div>
            <h3>Hours and offers</h3>
            <p>Manage public opening times and recurring Happy Hours.</p>
          </div>
        </div>
        <div className="schedule-header-fields [display:grid] [flex:0_1_480px] [grid-template-columns:minmax(150px,_0.7fr)_minmax(190px,_1fr)] [gap:9px] [min-width:0] max-[700px]:[flex:auto] max-[700px]:[grid-template-columns:1fr] max-[700px]:[width:100%]">
          <div className="schedule-timezone [display:grid] [min-width:0] [gap:6px] [color:var(--muted)] [font-size:10px] [font-weight:900] [text-transform:uppercase] [letter-spacing:0.06em] [&_input]:[box-sizing:border-box] [&_input]:[width:100%] [&_input]:[min-width:0] [&_select]:[box-sizing:border-box] [&_select]:[width:100%] [&_select]:[min-width:0] [&_input]:[height:48px] [&_.custom-dropdown]:[width:100%] [&_.custom-dropdown-trigger]:[width:100%] [&_.custom-dropdown-trigger]:[direction:ltr] max-[700px]:[width:100%]">
            <span>Week starts on</span>
            <CustomDropdown
              ariaLabel="Week starts on"
              value={firstDayOfWeek}
              options={RESTAURANT_WEEKDAYS.map((day) => ({
                value: day,
                label: dayLabels[day],
              }))}
              onChange={(firstDay) =>
                onChange({
                  ...openingHours,
                  firstDayOfWeek: firstDay as RestaurantWeekday,
                })
              }
            />
          </div>
          <div className="schedule-timezone [display:grid] [min-width:0] [gap:6px] [color:var(--muted)] [font-size:10px] [font-weight:900] [text-transform:uppercase] [letter-spacing:0.06em] [&_input]:[box-sizing:border-box] [&_input]:[width:100%] [&_input]:[min-width:0] [&_select]:[box-sizing:border-box] [&_select]:[width:100%] [&_select]:[min-width:0] [&_input]:[height:48px] [&_.custom-dropdown]:[width:100%] [&_.custom-dropdown-trigger]:[width:100%] [&_.custom-dropdown-trigger]:[direction:ltr] max-[700px]:[width:100%]">
            <span>Timezone</span>
            <CustomDropdown
              ariaLabel="Timezone"
              value={openingHours.timezone}
              options={[
                ...new Set([openingHours.timezone, ...availableTimezones]),
              ].map((timezone) => ({
                value: timezone,
                label: timezoneCityLabel(timezone),
                meta: timezoneLocalTimeLabel(timezone, currentTime),
              }))}
              onChange={(timezone) =>
                onChange({ ...openingHours, timezone })
              }
            />
          </div>
        </div>
      </header>

      <div className="schedule-tabs [display:grid] [grid-template-columns:1fr_1fr] [gap:6px] [margin:16px_20px_0] [padding:5px] [border-radius:15px] [background:var(--soft)] [&_button]:[display:flex] [&_button]:[align-items:center] [&_button]:[justify-content:center] [&_button]:[gap:8px] [&_button]:[min-width:0] [&_button]:[min-height:43px] [&_button]:[padding:8px_12px] [&_button]:[border:0] [&_button]:[border-radius:11px] [&_button]:[background:transparent] [&_button]:[color:var(--muted)] [&_button]:[font:inherit] [&_button]:[font-size:12px] [&_button]:[font-weight:900] [&_button]:[cursor:pointer] [&_button>span]:[display:grid] [&_button>span]:[min-width:22px] [&_button>span]:[height:22px] [&_button>span]:[place-items:center] [&_button>span]:[padding:0_5px] [&_button>span]:[border-radius:999px] [&_button>span]:[background:rgba(0,_0,_0,_0.07)] [&_button>span]:[font-size:10px] [&_button.active]:[background:var(--surface)] [&_button.active]:[color:var(--ink)] [&_button.active]:[box-shadow:0_3px_12px_rgba(35,_31,_25,_0.08)] [&_button.active.happy]:[color:var(--warning)] max-[700px]:[margin-inline:14px]" role="tablist" aria-label="Hours type">
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === "REGULAR"}
          className={activePanel === "REGULAR" ? "active" : ""}
          onClick={() => setActivePanel("REGULAR")}
        >
          <ClockIcon size={17} weight="bold" /> Regular hours
          <span>{regularPeriodCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activePanel === "HAPPY"}
          className={activePanel === "HAPPY" ? "active happy" : ""}
          onClick={() => setActivePanel("HAPPY")}
        >
          <CheersIcon size={18} weight="bold" /> Happy hours
          <span>{happyPeriodCount}</span>
        </button>
      </div>

      <div className="schedule-panel-heading [display:flex] [align-items:center] [justify-content:space-between] [gap:18px] [padding:18px_20px_12px] [&_p]:[margin:4px_0_0] [&_p]:[color:var(--muted)] [&_p]:[font-size:11px] max-[700px]:[align-items:stretch] max-[700px]:[flex-direction:column] max-[700px]:[padding-inline:14px]">
        <div>
          <strong>
            {activePanel === "REGULAR"
              ? "Weekly opening schedule"
              : "Weekly Happy Hour offers"}
          </strong>
          <p>
            {activePanel === "REGULAR"
              ? "Turn a day on, then add one or more opening periods."
              : "Set the discount and what it applies to for each offer."}
          </p>
        </div>
        <button
          type="button"
          className="copy-first-day-action [display:flex] [align-items:center] [justify-content:center] [gap:6px] [padding:8px_11px] [border:1px_solid_var(--line)] [border-radius:10px] [background:var(--surface)] [color:var(--ink)] [font-size:11px] [font-weight:850] [cursor:pointer] [&:disabled]:[opacity:.38] [&:disabled]:[cursor:not-allowed] max-[700px]:[width:100%]"
          disabled={!firstDayHasSchedule}
          onClick={copyFirstDaySchedule}
        >
          <CopyIcon size={15} weight="bold" /> Copy {dayLabels[firstDayOfWeek]} to all days
        </button>
      </div>

      {activePanel === "REGULAR" ? (
        <div className="schedule-days [display:grid] [gap:8px] [padding:0_20px_20px] max-[700px]:[padding-inline:14px]" role="tabpanel">
          {orderedDays.map((day) => {
            const periods = openingHours.weekly[day];
            const isOpen = periods.length > 0;
            return (
              <article className={`schedule-day [min-width:0] [border:1px_solid_var(--line)] [border-radius:15px] [background:var(--soft)] [transition:border-color_0.16s_ease,_background_0.16s_ease] [&.enabled]:[border-color:var(--line)] [&.enabled]:[background:var(--surface)] [&.enabled.offer]:[border-color:var(--warning-border)] ${isOpen ? "enabled" : ""}`} key={day}>
                <div className="schedule-day-header [display:flex] [align-items:center] [justify-content:space-between] [gap:16px] [min-height:60px] [padding:11px_14px] [&>div]:[display:flex] [&>div]:[align-items:baseline] [&>div]:[min-width:0] [&>div]:[gap:9px] [&_strong]:[min-width:82px] [&_strong]:[font-size:13px] [&>div>span]:[color:var(--muted)] [&>div>span]:[font-size:11px] max-[700px]:[&_strong]:[min-width:0] max-[700px]:[&>div]:[align-items:flex-start] max-[700px]:[&>div]:[flex-direction:column] max-[700px]:[&>div]:[gap:2px]">
                  <div><strong>{dayLabels[day]}</strong><span>{isOpen ? `${periods.length} period${periods.length === 1 ? "" : "s"}` : "Closed"}</span></div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOpen}
                    className={`schedule-toggle [display:flex] [align-items:center] [gap:7px] [min-width:82px] [padding:7px_10px] [border:1px_solid_var(--line)] [border-radius:999px] [background:var(--surface)] [color:var(--muted)] [font-size:11px] [font-weight:900] [cursor:pointer] [&>span]:[position:relative] [&>span]:[width:24px] [&>span]:[height:14px] [&>span]:[border-radius:999px] [&>span]:[background:#c9c5be] [&>span:after]:[position:absolute] [&>span:after]:[top:2px] [&>span:after]:[left:2px] [&>span:after]:[width:10px] [&>span:after]:[height:10px] [&>span:after]:[border-radius:50%] [&>span:after]:[background:#fff] [&>span:after]:[content:''] [&>span:after]:[transition:transform_0.16s_ease] [&.active]:[border-color:var(--success-border)] [&.active]:[background:var(--success-soft)] [&.active]:[color:var(--success)] [&.active>span]:[background:var(--green)] [&.active>span:after]:[transform:translateX(10px)] ${isOpen ? "active" : ""}`}
                    onClick={() => setPeriods(day, isOpen ? [] : [{ open: "09:00", close: "17:00" }])}
                  ><span /> {isOpen ? "Open" : "Closed"}</button>
                </div>
                {isOpen ? (
                  <div className="schedule-period-list [display:grid] [gap:8px] [padding:0_12px_12px]">
                    {periods.map((period, index) => (
                      <div className="schedule-period [display:grid] [grid-template-columns:28px_minmax(0,_1fr)_36px] [align-items:end] [gap:9px] [min-width:0] [padding:10px] [border:1px_solid_var(--line)] [border-radius:12px] [background:var(--soft)] [&.happy]:[background:color-mix(in_srgb,_var(--warning-soft)_48%,_var(--surface))] [&.happy_.schedule-period-number]:[background:var(--warning-soft)] [&.happy_.schedule-period-number]:[color:var(--warning)] max-[1050px]:[align-items:start] max-[700px]:[grid-template-columns:26px_minmax(0,_1fr)_34px] max-[700px]:[padding:8px]" key={`${day}-${index}`}>
                        <div className="schedule-period-number [display:grid] [width:28px] [height:28px] [place-items:center] [align-self:center] [border-radius:9px] [background:var(--surface)] [color:var(--muted)] [font-size:11px] [font-weight:900]">{index + 1}</div>
                        <div className="schedule-period-times [display:grid] [grid-template-columns:repeat(2,_minmax(0,_1fr))] [gap:8px] [min-width:0] max-[700px]:[grid-template-columns:1fr]">
                          <OpeningTimeField label="Opens" day={day} field="open" value={period.open} onChange={(open) => updatePeriod(day, index, { open })} />
                          <OpeningTimeField label="Closes" day={day} field="close" value={period.close} onChange={(close) => updatePeriod(day, index, { close })} />
                        </div>
                        <button type="button" className="schedule-remove [display:grid] [width:36px] [height:36px] [place-items:center] [align-self:center] [padding:0] [border:0] [border-radius:10px] [background:var(--danger-soft)] [color:var(--danger)] [cursor:pointer]" aria-label={`Remove ${dayLabels[day]} period ${index + 1}`} onClick={() => setPeriods(day, periods.filter((_, itemIndex) => itemIndex !== index))}><TrashIcon size={17} /></button>
                      </div>
                    ))}
                    {periods.length < 4 ? (
                      <button type="button" className="schedule-add-period [display:flex] [align-items:center] [justify-content:center] [gap:6px] [min-height:36px] [border:1px_dashed_var(--line)] [border-radius:10px] [background:transparent] [color:var(--ink)] [font-size:11px] [font-weight:900] [cursor:pointer] [&.happy]:[border-color:var(--warning-border)] [&.happy]:[color:var(--warning)]" onClick={() => setPeriods(day, [...periods, { open: "18:00", close: "22:00" }])}><PlusIcon size={15} weight="bold" /> Add another period</button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="schedule-days [display:grid] [gap:8px] [padding:0_20px_20px] max-[700px]:[padding-inline:14px] happy" role="tabpanel">
          {orderedDays.map((day) => {
            const periods = happyHours[day];
            return (
              <article className={`schedule-day [min-width:0] [border:1px_solid_var(--line)] [border-radius:15px] [background:var(--soft)] [transition:border-color_0.16s_ease,_background_0.16s_ease] [&.enabled]:[border-color:var(--line)] [&.enabled]:[background:var(--surface)] [&.enabled.offer]:[border-color:var(--warning-border)] ${periods.length ? "enabled offer" : ""}`} key={`happy-${day}`}>
                <div className="schedule-day-header [display:flex] [align-items:center] [justify-content:space-between] [gap:16px] [min-height:60px] [padding:11px_14px] [&>div]:[display:flex] [&>div]:[align-items:baseline] [&>div]:[min-width:0] [&>div]:[gap:9px] [&_strong]:[min-width:82px] [&_strong]:[font-size:13px] [&>div>span]:[color:var(--muted)] [&>div>span]:[font-size:11px] max-[700px]:[&_strong]:[min-width:0] max-[700px]:[&>div]:[align-items:flex-start] max-[700px]:[&>div]:[flex-direction:column] max-[700px]:[&>div]:[gap:2px]">
                  <div><strong>{dayLabels[day]}</strong><span>{periods.length ? `${periods.length} offer${periods.length === 1 ? "" : "s"}` : "No offer"}</span></div>
                  {periods.length === 0 ? (
                    <button type="button" className="schedule-day-add [display:flex] [align-items:center] [gap:5px] [padding:7px_10px] [border:1px_solid_var(--warning-border)] [border-radius:10px] [background:var(--warning-soft)] [color:var(--warning)] [font-size:11px] [font-weight:900] [cursor:pointer]" onClick={() => setHappyHours(day, [{ open: "16:00", close: "19:00", discountPercent: 20, appliesTo: "ALL_MENU" }])}><PlusIcon size={15} weight="bold" /> Add offer</button>
                  ) : null}
                </div>
                {periods.length ? (
                  <div className="schedule-period-list [display:grid] [gap:8px] [padding:0_12px_12px]">
                    {periods.map((period, index) => {
                      const open = typeof period.open === "string" ? period.open : "16:00";
                      const close = typeof period.close === "string" ? period.close : "19:00";
                      const targetValue =
                        period.appliesTo === "MENU_SECTIONS"
                          ? `SECTION:${period.menuSectionIds?.[0] ?? ""}`
                          : period.appliesTo;
                      return (
                        <div className="schedule-period [display:grid] [grid-template-columns:28px_minmax(0,_1fr)_36px] [align-items:end] [gap:9px] [min-width:0] [padding:10px] [border:1px_solid_var(--line)] [border-radius:12px] [background:var(--soft)] [&.happy]:[background:color-mix(in_srgb,_var(--warning-soft)_48%,_var(--surface))] [&.happy_.schedule-period-number]:[background:var(--warning-soft)] [&.happy_.schedule-period-number]:[color:var(--warning)] max-[1050px]:[align-items:start] max-[700px]:[grid-template-columns:26px_minmax(0,_1fr)_34px] max-[700px]:[padding:8px] happy" key={`happy-${day}-${index}`}>
                          <div className="schedule-period-number [display:grid] [width:28px] [height:28px] [place-items:center] [align-self:center] [border-radius:9px] [background:var(--surface)] [color:var(--muted)] [font-size:11px] [font-weight:900]"><CheersIcon size={15} weight="fill" /></div>
                          <div className="happy-period-fields [&_label]:[display:grid] [&_label]:[min-width:0] [&_label]:[gap:5px] [&_label>span:first-child]:[color:var(--muted)] [&_label>span:first-child]:[font-size:9px] [&_label>span:first-child]:[font-weight:900] [&_label>span:first-child]:[text-transform:uppercase] [&_label>span:first-child]:[letter-spacing:0.05em] [&_input]:[box-sizing:border-box] [&_input]:[width:100%] [&_input]:[min-width:0] [&_input]:[max-width:100%] [&_input]:[height:40px] [display:grid] [grid-template-columns:repeat(4,_minmax(0,_1fr))] [gap:8px] [min-width:0] [&_.discount-input]:[height:40px] [&>label>input]:[height:48px] [&_.discount-input]:[height:48px] [&_.discount-input_input]:[height:46px] max-[1050px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[700px]:[grid-template-columns:1fr]">
                            <label><span>Starts</span><input type="time" value={open} onChange={(event) => updateHappyHour(day, index, { open: event.target.value })} required /></label>
                            <label><span>Ends</span><input type="time" value={close} onChange={(event) => updateHappyHour(day, index, { close: event.target.value })} required /></label>
                            <label><span>Discount</span><span className="discount-input [display:grid] [grid-template-columns:minmax(0,_1fr)_auto] [align-items:center] [min-width:0] [overflow:hidden] [border:1px_solid_var(--line)] [border-radius:10px] [background:var(--surface)] [&_input]:[width:100%] [&_input]:[min-width:0] [&_input]:[border:0] [&_input]:[border-radius:0] [&_input]:[background:transparent] [&_span]:[white-space:nowrap] [&_span]:[padding-right:10px] [&_span]:[color:var(--muted)] [&_span]:[font-size:12px] [&_span]:[font-weight:800]"><input type="number" min={1} max={100} value={period.discountPercent} onChange={(event) => updateHappyHour(day, index, { discountPercent: Number(event.target.value) })} required /><span>% off</span></span></label>
                            <div className="happy-period-field [display:grid] [min-width:0] [gap:5px] [&>span:first-child]:[color:var(--muted)] [&>span:first-child]:[font-size:9px] [&>span:first-child]:[font-weight:900] [&>span:first-child]:[text-transform:uppercase] [&>span:first-child]:[letter-spacing:0.05em]">
                              <span>Applies to</span>
                              <CustomDropdown
                                ariaLabel="Happy Hour applies to"
                                value={targetValue}
                                options={happyHourTargetOptions}
                                onChange={(target) => {
                                  if (target.startsWith("SECTION:")) {
                                    updateHappyHour(day, index, {
                                      appliesTo: "MENU_SECTIONS",
                                      menuSectionIds: [target.slice("SECTION:".length)],
                                      dishIds: undefined,
                                    });
                                    return;
                                  }
                                  updateHappyHour(day, index, {
                                    appliesTo: target as RestaurantHappyHourPeriod["appliesTo"],
                                    menuSectionIds: undefined,
                                    dishIds:
                                      target === "DISHES"
                                        ? (period.dishIds ?? [])
                                        : undefined,
                                  });
                                }}
                              />
                            </div>
                            {period.appliesTo === "DISHES" ? (
                              <DishTargetPicker
                                menus={menus}
                                selectedIds={period.dishIds ?? []}
                                onChange={(dishIds) =>
                                  updateHappyHour(day, index, { dishIds })
                                }
                              />
                            ) : null}
                          </div>
                          <button type="button" className="schedule-remove [display:grid] [width:36px] [height:36px] [place-items:center] [align-self:center] [padding:0] [border:0] [border-radius:10px] [background:var(--danger-soft)] [color:var(--danger)] [cursor:pointer]" aria-label={`Remove ${dayLabels[day]} Happy Hour ${index + 1}`} onClick={() => setHappyHours(day, periods.filter((_, itemIndex) => itemIndex !== index))}><TrashIcon size={17} /></button>
                        </div>
                      );
                    })}
                    {periods.length < 4 ? (
                      <button type="button" className="schedule-add-period [display:flex] [align-items:center] [justify-content:center] [gap:6px] [min-height:36px] [border:1px_dashed_var(--line)] [border-radius:10px] [background:transparent] [color:var(--ink)] [font-size:11px] [font-weight:900] [cursor:pointer] [&.happy]:[border-color:var(--warning-border)] [&.happy]:[color:var(--warning)] happy" onClick={() => setHappyHours(day, [...periods, { open: "16:00", close: "19:00", discountPercent: 20, appliesTo: "ALL_MENU" }])}><PlusIcon size={15} weight="bold" /> Add another offer</button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <footer className="schedule-editor-footer [display:flex] [align-items:center] [justify-content:space-between] [gap:16px] [padding:14px_20px] [border-top:1px_solid_var(--line)] [background:var(--soft)] [&_span]:[color:var(--muted)] [&_span]:[font-size:10px] [&_button]:[padding:6px] [&_button]:[border:0] [&_button]:[background:transparent] [&_button]:[color:var(--danger)] [&_button]:[font-size:11px] [&_button]:[font-weight:850] [&_button]:[cursor:pointer] max-[700px]:[align-items:flex-start] max-[700px]:[flex-direction:column]">
        <span>Changes are published when you save the restaurant profile.</span>
        <button type="button" onClick={() => onChange(null)}>Remove all hours</button>
      </footer>
    </section>
  );
}
