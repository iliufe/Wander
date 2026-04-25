import { useEffect, useRef, useState } from "react";
import type { TimeSelection } from "../types";
import { useCopy } from "../i18n";

const hourValues = Array.from({ length: 13 }, (_, index) => index);
const minuteValues = Array.from({ length: 60 }, (_, index) => index);

interface TimeWheelPickerProps {
  value: TimeSelection;
  onChange: (next: TimeSelection) => void;
}

export function TimeWheelPicker({ value, onChange }: TimeWheelPickerProps) {
  const copy = useCopy();
  const [openField, setOpenField] = useState<"hours" | "minutes" | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const safeValue = value.hours === 12 ? { hours: 12, minutes: 0 } : value;
  const minuteOptions = safeValue.hours === 12 ? [0] : minuteValues;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenField(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <section className="time-picker-card" ref={containerRef}>
      <div className="time-picker-head">
        <div>
          <span className="mini-label">{copy.timePicker.eyebrow}</span>
          <strong>{copy.timePicker.title}</strong>
        </div>
        <span className="time-budget-label">
          {safeValue.hours} {copy.timePicker.hours} {String(safeValue.minutes).padStart(2, "0")}{" "}
          {copy.timePicker.minutes}
        </span>
      </div>

      <div className="time-select-grid">
        <TimeSelectField
          label={copy.timePicker.hours}
          value={String(safeValue.hours)}
          open={openField === "hours"}
          options={hourValues}
          formatValue={(item) => `${item}`}
          onToggle={() => setOpenField((current) => (current === "hours" ? null : "hours"))}
          onSelect={(hours) => {
            onChange({
              hours,
              minutes: hours === 12 ? 0 : safeValue.minutes,
            });
            setOpenField(null);
          }}
          selected={safeValue.hours}
        />
        <TimeSelectField
          label={copy.timePicker.minutes}
          value={String(safeValue.minutes).padStart(2, "0")}
          open={openField === "minutes"}
          options={minuteOptions}
          formatValue={(item) => String(item).padStart(2, "0")}
          onToggle={() => setOpenField((current) => (current === "minutes" ? null : "minutes"))}
          onSelect={(minutes) => {
            onChange({ ...safeValue, minutes });
            setOpenField(null);
          }}
          selected={safeValue.minutes}
        />
      </div>
    </section>
  );
}

interface TimeSelectFieldProps {
  label: string;
  value: string;
  open: boolean;
  options: number[];
  formatValue: (value: number) => string;
  onToggle: () => void;
  onSelect: (value: number) => void;
  selected: number;
}

function TimeSelectField({
  label,
  value,
  open,
  options,
  formatValue,
  onToggle,
  onSelect,
  selected,
}: TimeSelectFieldProps) {
  return (
    <div className="time-select-field">
      <span className="mini-label">{label}</span>
      <div className={`time-select-shell ${open ? "is-open" : ""}`}>
        <button
          aria-expanded={open}
          className="time-select-trigger"
          type="button"
          onClick={onToggle}
        >
          <span className="time-select-value">{value}</span>
          <span className="time-select-icon" aria-hidden="true"></span>
        </button>
        {open ? (
          <div className="time-select-menu" role="listbox" aria-label={label}>
            {options.map((item) => (
              <button
                aria-selected={item === selected}
                className={`time-select-option ${item === selected ? "is-selected" : ""}`}
                key={`${label}-${item}`}
                role="option"
                type="button"
                onClick={() => onSelect(item)}
              >
                {formatValue(item)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
