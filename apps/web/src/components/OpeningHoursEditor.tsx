import {
  RESTAURANT_WEEKDAYS,
  type RestaurantOpeningHours,
  type RestaurantOpeningPeriod,
  type RestaurantWeekday,
} from "@findeat/types";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
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
                      <label>
                        Opens
                        <input
                          type="time"
                          aria-label={`${dayLabels[day]} opening time`}
                          value={period.open}
                          onChange={(event) =>
                            updatePeriod(day, index, { open: event.target.value })
                          }
                          required
                        />
                      </label>
                      <label>
                        Closes
                        <input
                          type="time"
                          aria-label={`${dayLabels[day]} closing time`}
                          value={period.close}
                          onChange={(event) =>
                            updatePeriod(day, index, { close: event.target.value })
                          }
                          required
                        />
                      </label>
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
