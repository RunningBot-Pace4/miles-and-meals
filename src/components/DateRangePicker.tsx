"use client";

import { useMemo, useRef, useState } from "react";
import {
  selectDateRange,
  type DateRangeValue,
} from "@/lib/date-range";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${(month + 1)
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function displayDate(value: string): string {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function DateRangePicker({
  defaultStartDate = "",
  defaultEndDate = "",
  startName,
  endName,
  onChange,
  label = "Trip dates",
}: {
  defaultStartDate?: string;
  defaultEndDate?: string;
  startName?: string;
  endName?: string;
  onChange?: (value: DateRangeValue) => void;
  label?: string;
}) {
  const initialDate = parseDate(defaultStartDate) ?? new Date();
  const [range, setRange] = useState<DateRangeValue>({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });
  const [month, setMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const count = new Date(year, monthIndex + 1, 0).getDate();
    const mondayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;

    return [
      ...Array.from({ length: mondayOffset }, () => null),
      ...Array.from({ length: count }, (_, index) => ({
        day: index + 1,
        value: toIsoDate(year, monthIndex, index + 1),
      })),
    ];
  }, [month]);

  function update(next: DateRangeValue) {
    setRange(next);
    onChange?.(next);
  }

  function choose(value: string) {
    const next = selectDateRange(range, value);
    update(next);
    if (next.startDate && next.endDate) setOpen(false);
  }

  function moveMonth(offset: number) {
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  const summary = range.startDate
    ? range.endDate
      ? `${displayDate(range.startDate)} – ${displayDate(range.endDate)}`
      : `${displayDate(range.startDate)} – choose end date`
    : "Choose start and end dates";

  return (
    <div className="date-range-picker" ref={panelRef}>
      {startName ? (
        <input type="hidden" name={startName} value={range.startDate} />
      ) : null}
      {endName ? (
        <input type="hidden" name={endName} value={range.endDate} />
      ) : null}

      <span className="date-range-label">{label}</span>
      <button
        className="date-range-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">▣</span>
        <strong>{summary}</strong>
        <small>{range.startDate && !range.endDate ? "Now tap the last day" : "Tap once for start, once for end"}</small>
      </button>

      {open ? (
        <section className="date-range-popover" role="dialog" aria-label={label}>
          <header>
            <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button>
            <strong>
              {new Intl.DateTimeFormat("en-MY", {
                month: "long",
                year: "numeric",
              }).format(month)}
            </strong>
            <button type="button" aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
          </header>

          <div className="date-range-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="date-range-days">
            {days.map((item, index) => {
              if (!item) return <span key={`blank-${index}`} />;
              const isStart = item.value === range.startDate;
              const isEnd = item.value === range.endDate;
              const inRange = Boolean(
                range.startDate &&
                  range.endDate &&
                  item.value > range.startDate &&
                  item.value < range.endDate,
              );
              return (
                <button
                  type="button"
                  data-date={item.value}
                  className={`${isStart ? "range-start " : ""}${isEnd ? "range-end " : ""}${inRange ? "in-range" : ""}`.trim()}
                  aria-label={displayDate(item.value)}
                  aria-pressed={isStart || isEnd}
                  onClick={() => choose(item.value)}
                  key={item.value}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          <footer>
            <span>{range.startDate ? summary : "Select the first day"}</span>
            <button type="button" onClick={() => update({ startDate: "", endDate: "" })}>
              Clear
            </button>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
