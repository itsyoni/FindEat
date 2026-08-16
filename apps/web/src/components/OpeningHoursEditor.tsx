import {
  RESTAURANT_WEEKDAYS,
  type RestaurantOpeningHours,
  type RestaurantOpeningPeriod,
  type RestaurantOpeningTime,
  type RestaurantWeekday,
} from "@findeat/types";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { CheersIcon } from "@phosphor-icons/react/dist/csr/Cheers";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { createEmptyOpeningHours } from "./openingHours";

const dayLabels: Record<RestaurantWeekday, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

function OpeningTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RestaurantOpeningTime;
  onChange: (value: RestaurantOpeningTime) => void;
}) {
  const mode = typeof value === "string" ? "FIXED" : value.type;
  const fixedTime =
    typeof value === "string" ? value : value.type === "FIXED" ? value.time : "09:00";
  const offset =
    typeof value === "object" && value.type !== "FIXED" ? value.offsetMinutes : 0;
  return <div className="opening-hours-time-rule">
    <label>{label}<select value={mode} onChange={(event) => {
      const nextMode = event.target.value;
      onChange(nextMode === "FIXED" ? fixedTime : { type: nextMode as "SHABBAT_ENTRY" | "SHABBAT_END", offsetMinutes: 0 });
    }}><option value="FIXED">Fixed time</option><option value="SHABBAT_ENTRY">Shabbat entry</option><option value="SHABBAT_END">Shabbat end</option></select></label>
    {mode === "FIXED" ? <label>Time<input type="time" value={fixedTime} onChange={(event) => onChange(event.target.value)} required /></label> : <label>Offset (minutes)<input type="number" min={-180} max={180} value={offset} onChange={(event) => onChange({ type: mode as "SHABBAT_ENTRY" | "SHABBAT_END", offsetMinutes: Number(event.target.value) })} /></label>}
  </div>;
}

export function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: RestaurantOpeningHours | null;
  onChange: (value: RestaurantOpeningHours | null) => void;
}) {
  if (!value) {
    return (
      <fieldset className="opening-hours-editor full empty">
        <legend>
          <ClockIcon size={18} weight="duotone" /> Opening hours
        </legend>
        <div className="opening-hours-empty">
          <div>
            <strong>No public hours yet</strong>
            <p className="muted">
              Add the weekly schedule to show customers whether the restaurant is open.
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => onChange(createEmptyOpeningHours())}
          >
            Add opening hours
          </button>
        </div>
      </fieldset>
    );
  }
  const openingHours = value;

  function setPeriods(day: RestaurantWeekday, periods: RestaurantOpeningPeriod[]) {
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

  const happyHours =
    openingHours.happyHours ?? createEmptyOpeningHours().happyHours!;

  function setHappyHours(
    day: RestaurantWeekday,
    periods: RestaurantOpeningPeriod[],
  ) {
    onChange({
      ...openingHours,
      happyHours: { ...happyHours, [day]: periods },
    });
  }

  function updateHappyHour(
    day: RestaurantWeekday,
    index: number,
    patch: Partial<RestaurantOpeningPeriod>,
  ) {
    setHappyHours(
      day,
      happyHours[day].map((period, periodIndex) =>
        periodIndex === index ? { ...period, ...patch } : period,
      ),
    );
  }

  return (
    <fieldset className="opening-hours-editor full">
      <legend>
        <ClockIcon size={18} weight="duotone" /> Opening hours
      </legend>
      <div className="opening-hours-heading">
        <p className="muted">
          These hours appear publicly and determine the Open now status in the app.
        </p>
        <label>
          Timezone
          <input
            value={openingHours.timezone}
            onChange={(event) =>
              onChange({ ...openingHours, timezone: event.target.value })
            }
            placeholder="Asia/Jerusalem"
            required
          />
        </label>
      </div>

      <div className="opening-hours-days">
        {RESTAURANT_WEEKDAYS.map((day) => {
          const periods = openingHours.weekly[day];
          const isOpen = periods.length > 0;
          return (
            <div className="opening-hours-day" key={day}>
              <div className="opening-hours-day-name">
                <strong>{dayLabels[day]}</strong>
                <button
                  type="button"
                  className={isOpen ? "hours-state open" : "hours-state"}
                  onClick={() =>
                    setPeriods(day, isOpen ? [] : [{ open: "09:00", close: "17:00" }])
                  }
                >
                  {isOpen ? "Open" : "Closed"}
                </button>
              </div>

              <div className="opening-hours-periods">
                {periods.map((period, index) => (
                  <div className="opening-hours-period" key={`${day}-${index}`}>
                    <div className="opening-hours-time-fields">
                      <OpeningTimeField label="Opens" value={period.open} onChange={(open) => updatePeriod(day, index, { open })} />
                      <OpeningTimeField label="Closes" value={period.close} onChange={(close) => updatePeriod(day, index, { close })} />
                    </div>
                    <button
                      type="button"
                      className="icon-action"
                      aria-label={`Remove ${dayLabels[day]} time period`}
                      onClick={() =>
                        setPeriods(day, periods.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <TrashIcon size={17} />
                    </button>
                  </div>
                ))}
                {isOpen && periods.length < 4 && (
                  <button
                    type="button"
                    className="add-hours-period"
                    onClick={() =>
                      setPeriods(day, [...periods, { open: "18:00", close: "22:00" }])
                    }
                  >
                    <PlusIcon size={15} weight="bold" /> Add hours
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className="happy-hours-section">
        <div className="happy-hours-heading">
          <div className="happy-hours-icon">
            <CheersIcon size={20} weight="duotone" />
          </div>
          <div>
            <strong>Happy hours</strong>
            <p className="muted">
              Add recurring promotion times. While one is active, guests see a
              cheers badge on the restaurant map marker.
            </p>
          </div>
        </div>

        <div className="happy-hours-days">
          {RESTAURANT_WEEKDAYS.map((day) => {
            const periods = happyHours[day];
            return (
              <div className="happy-hours-day" key={`happy-${day}`}>
                <strong>{dayLabels[day]}</strong>
                <div className="opening-hours-periods">
                  {periods.map((period, index) => {
                    const open = typeof period.open === "string" ? period.open : "16:00";
                    const close = typeof period.close === "string" ? period.close : "19:00";
                    return (
                      <div className="opening-hours-period" key={`happy-${day}-${index}`}>
                        <div className="happy-hours-time-fields">
                          <label>
                            Starts
                            <input type="time" value={open} onChange={(event) => updateHappyHour(day, index, { open: event.target.value })} required />
                          </label>
                          <label>
                            Ends
                            <input type="time" value={close} onChange={(event) => updateHappyHour(day, index, { close: event.target.value })} required />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="icon-action"
                          aria-label={`Remove ${dayLabels[day]} happy hour`}
                          onClick={() => setHappyHours(day, periods.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          <TrashIcon size={17} />
                        </button>
                      </div>
                    );
                  })}
                  {periods.length < 4 && (
                    <button
                      type="button"
                      className="add-hours-period"
                      onClick={() => setHappyHours(day, [...periods, { open: "16:00", close: "19:00" }])}
                    >
                      <PlusIcon size={15} weight="bold" /> Add happy hour
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <button
        type="button"
        className="remove-opening-hours"
        onClick={() => onChange(null)}
      >
        Remove public opening hours
      </button>
    </fieldset>
  );
}
