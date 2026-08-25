"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  startName?: string;
  endName?: string;
  label?: string;
  minDate?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatDisplayDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return "Choose date";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function calendarDays(viewMonth: Date): Date[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset, 12);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  startName,
  endName,
  label = "Travel dates",
  minDate = "",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [pickingEnd, setPickingEnd] = useState(Boolean(startDate && !endDate));
  const initialMonth = parseIsoDate(startDate) ?? parseIsoDate(endDate) ?? new Date();
  const [viewMonth, setViewMonth] = useState(
    () => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1, 12),
  );
  const calendarId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const start = useMemo(() => parseIsoDate(startDate), [startDate]);
  const end = useMemo(() => parseIsoDate(endDate), [endDate]);
  const minimum = useMemo(() => parseIsoDate(minDate), [minDate]);
  const days = useMemo(() => calendarDays(viewMonth), [viewMonth]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openPicker() {
    const anchor = start ?? end ?? new Date();
    setViewMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12));
    setPickingEnd(Boolean(start && !end));
    setOpen(true);
  }

  function togglePicker() {
    if (open) {
      setOpen(false);
      return;
    }

    openPicker();
  }

  function choose(date: Date) {
    if (minimum && startOfDay(date) < startOfDay(minimum)) return;

    const next = toIsoDate(date);

    if (!pickingEnd || !startDate || endDate) {
      onChange({ startDate: next, endDate: "" });
      setPickingEnd(true);
      return;
    }

    const existingStart = parseIsoDate(startDate);
    if (!existingStart || startOfDay(date) < startOfDay(existingStart)) {
      onChange({ startDate: next, endDate: "" });
      setPickingEnd(true);
      return;
    }

    onChange({ startDate, endDate: next });
    setPickingEnd(false);
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    setViewMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + delta, 1, 12),
    );
  }

  function clearRange() {
    onChange({ startDate: "", endDate: "" });
    setPickingEnd(false);
  }

  return (
    <div className="date-range-picker" ref={rootRef}>
      {startName ? <input type="hidden" name={startName} value={startDate} /> : null}
      {endName ? <input type="hidden" name={endName} value={endDate} /> : null}

      <span className="date-range-label">{label}</span>
      <button
        className="date-range-trigger"
        type="button"
        onClick={togglePicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={calendarId}
        aria-label={`${label}: ${startDate ? formatDisplayDate(startDate) : "choose start"} to ${endDate ? formatDisplayDate(endDate) : "choose end"}`}
      >
        <span className={startDate ? "date-range-value filled" : "date-range-value"}>
          <small>Start</small>
          <strong>{formatDisplayDate(startDate)}</strong>
        </span>
        <span className="date-range-arrow" aria-hidden="true">→</span>
        <span className={endDate ? "date-range-value filled" : "date-range-value"}>
          <small>End</small>
          <strong>{formatDisplayDate(endDate)}</strong>
        </span>
        <span className="date-range-calendar-icon" aria-hidden="true">▣</span>
      </button>
      <div className="date-range-guidance" aria-live="polite">
        <span className={startDate ? "done" : "active"}><b>1</b> Start</span>
        <span aria-hidden="true">→</span>
        <span className={endDate ? "done" : startDate ? "active" : ""}><b>2</b> End</span>
      </div>
      <small className="date-range-help">
        Tap one day for the start, then tap another day for the end. The dates between them are highlighted automatically.
      </small>

      {open ? (
        <section
          className="date-range-popover"
          id={calendarId}
          role="dialog"
          aria-modal="false"
          aria-label={`${label} calendar`}
        >
          <div className="date-range-popover-head">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
            <div>
              <strong>{monthLabel(viewMonth)}</strong>
              <small>{pickingEnd && startDate ? "Now choose the end date" : "Choose the start date"}</small>
            </div>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
          </div>

          <div className="date-range-weekdays" aria-hidden="true">
            {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="date-range-grid">
            {days.map((date) => {
              const time = startOfDay(date);
              const disabled = Boolean(minimum && time < startOfDay(minimum));
              const isStart = Boolean(start && sameDay(date, start));
              const isEnd = Boolean(end && sameDay(date, end));
              const inRange = Boolean(
                start && end && time > startOfDay(start) && time < startOfDay(end),
              );
              const outside = date.getMonth() !== viewMonth.getMonth();
              const classes = [
                "date-range-day",
                outside ? "outside" : "",
                inRange ? "in-range" : "",
                isStart ? "selected start" : "",
                isEnd ? "selected end" : "",
              ].filter(Boolean).join(" ");

              return (
                <button
                  key={toIsoDate(date)}
                  className={classes}
                  type="button"
                  disabled={disabled}
                  onClick={() => choose(date)}
                  aria-pressed={isStart || isEnd}
                  aria-label={new Intl.DateTimeFormat(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-range-popover-foot">
            <div className="date-range-foot-actions">
              <button className="text-button" type="button" onClick={() => choose(new Date())}>Today</button>
              <button className="text-button" type="button" onClick={clearRange}>Clear dates</button>
              <button className="text-button" type="button" onClick={() => setOpen(false)}>Close</button>
            </div>
            <span>{startDate ? formatDisplayDate(startDate) : "Start"} → {endDate ? formatDisplayDate(endDate) : "End"}</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
