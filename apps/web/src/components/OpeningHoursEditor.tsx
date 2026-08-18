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
    <div className={`happy-dish-picker ${selectedIds.length === 0 ? "required" : ""}`}>
      <button
        type="button"
        className="happy-dish-picker-trigger"
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
        <div className="happy-dish-picker-panel">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search dishes"
            autoFocus
          />
          <div className="happy-dish-options" role="listbox" aria-multiselectable="true">
            {visibleMenus.map((menu) => (
              <section key={menu.id}>
                <header>
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
                        <span className="happy-dish-fallback">
                          {dish.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>{dish.name}</span>
                      <span className="happy-dish-check">
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
      <label className="schedule-time-field">
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
    <div className="schedule-time-field">
      <span>{label}</span>
      <div className="schedule-time-control">
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
          <span className="schedule-offset-input">
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
      <section className="opening-hours-editor opening-hours-empty full">
        <div className="schedule-empty-icon">
          <ClockIcon size={24} weight="duotone" />
        </div>
        <div>
          <strong>Set your opening hours</strong>
          <p className="muted">
            Help guests know when you are open and promote Happy Hour offers.
          </p>
        </div>
        <button
          type="button"
          className="secondary"
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
    <section className="opening-hours-editor full">
      <header className="schedule-editor-header">
        <div className="schedule-editor-title">
          <div className="schedule-editor-icon">
            <ClockIcon size={23} weight="duotone" />
          </div>
          <div>
            <h3>Hours and offers</h3>
            <p>Manage public opening times and recurring Happy Hours.</p>
          </div>
        </div>
        <div className="schedule-header-fields">
          <div className="schedule-timezone">
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
          <div className="schedule-timezone">
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

      <div className="schedule-tabs" role="tablist" aria-label="Hours type">
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

      <div className="schedule-panel-heading">
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
          className="copy-first-day-action"
          disabled={!firstDayHasSchedule}
          onClick={copyFirstDaySchedule}
        >
          <CopyIcon size={15} weight="bold" /> Copy {dayLabels[firstDayOfWeek]} to all days
        </button>
      </div>

      {activePanel === "REGULAR" ? (
        <div className="schedule-days" role="tabpanel">
          {orderedDays.map((day) => {
            const periods = openingHours.weekly[day];
            const isOpen = periods.length > 0;
            return (
              <article className={`schedule-day ${isOpen ? "enabled" : ""}`} key={day}>
                <div className="schedule-day-header">
                  <div><strong>{dayLabels[day]}</strong><span>{isOpen ? `${periods.length} period${periods.length === 1 ? "" : "s"}` : "Closed"}</span></div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOpen}
                    className={`schedule-toggle ${isOpen ? "active" : ""}`}
                    onClick={() => setPeriods(day, isOpen ? [] : [{ open: "09:00", close: "17:00" }])}
                  ><span /> {isOpen ? "Open" : "Closed"}</button>
                </div>
                {isOpen ? (
                  <div className="schedule-period-list">
                    {periods.map((period, index) => (
                      <div className="schedule-period" key={`${day}-${index}`}>
                        <div className="schedule-period-number">{index + 1}</div>
                        <div className="schedule-period-times">
                          <OpeningTimeField label="Opens" day={day} field="open" value={period.open} onChange={(open) => updatePeriod(day, index, { open })} />
                          <OpeningTimeField label="Closes" day={day} field="close" value={period.close} onChange={(close) => updatePeriod(day, index, { close })} />
                        </div>
                        <button type="button" className="schedule-remove" aria-label={`Remove ${dayLabels[day]} period ${index + 1}`} onClick={() => setPeriods(day, periods.filter((_, itemIndex) => itemIndex !== index))}><TrashIcon size={17} /></button>
                      </div>
                    ))}
                    {periods.length < 4 ? (
                      <button type="button" className="schedule-add-period" onClick={() => setPeriods(day, [...periods, { open: "18:00", close: "22:00" }])}><PlusIcon size={15} weight="bold" /> Add another period</button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="schedule-days happy" role="tabpanel">
          {orderedDays.map((day) => {
            const periods = happyHours[day];
            return (
              <article className={`schedule-day ${periods.length ? "enabled offer" : ""}`} key={`happy-${day}`}>
                <div className="schedule-day-header">
                  <div><strong>{dayLabels[day]}</strong><span>{periods.length ? `${periods.length} offer${periods.length === 1 ? "" : "s"}` : "No offer"}</span></div>
                  {periods.length === 0 ? (
                    <button type="button" className="schedule-day-add" onClick={() => setHappyHours(day, [{ open: "16:00", close: "19:00", discountPercent: 20, appliesTo: "ALL_MENU" }])}><PlusIcon size={15} weight="bold" /> Add offer</button>
                  ) : null}
                </div>
                {periods.length ? (
                  <div className="schedule-period-list">
                    {periods.map((period, index) => {
                      const open = typeof period.open === "string" ? period.open : "16:00";
                      const close = typeof period.close === "string" ? period.close : "19:00";
                      const targetValue =
                        period.appliesTo === "MENU_SECTIONS"
                          ? `SECTION:${period.menuSectionIds?.[0] ?? ""}`
                          : period.appliesTo;
                      return (
                        <div className="schedule-period happy" key={`happy-${day}-${index}`}>
                          <div className="schedule-period-number"><CheersIcon size={15} weight="fill" /></div>
                          <div className="happy-period-fields">
                            <label><span>Starts</span><input type="time" value={open} onChange={(event) => updateHappyHour(day, index, { open: event.target.value })} required /></label>
                            <label><span>Ends</span><input type="time" value={close} onChange={(event) => updateHappyHour(day, index, { close: event.target.value })} required /></label>
                            <label><span>Discount</span><span className="discount-input"><input type="number" min={1} max={100} value={period.discountPercent} onChange={(event) => updateHappyHour(day, index, { discountPercent: Number(event.target.value) })} required /><span>% off</span></span></label>
                            <div className="happy-period-field">
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
                          <button type="button" className="schedule-remove" aria-label={`Remove ${dayLabels[day]} Happy Hour ${index + 1}`} onClick={() => setHappyHours(day, periods.filter((_, itemIndex) => itemIndex !== index))}><TrashIcon size={17} /></button>
                        </div>
                      );
                    })}
                    {periods.length < 4 ? (
                      <button type="button" className="schedule-add-period happy" onClick={() => setHappyHours(day, [...periods, { open: "16:00", close: "19:00", discountPercent: 20, appliesTo: "ALL_MENU" }])}><PlusIcon size={15} weight="bold" /> Add another offer</button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <footer className="schedule-editor-footer">
        <span>Changes are published when you save the restaurant profile.</span>
        <button type="button" onClick={() => onChange(null)}>Remove all hours</button>
      </footer>
    </section>
  );
}
