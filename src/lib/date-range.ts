export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

export function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidDateRange(
  startDate: string,
  endDate: string,
): boolean {
  if (!startDate && !endDate) return true;
  if (!startDate || !endDate) return false;

  return (
    isIsoCalendarDate(startDate) &&
    isIsoCalendarDate(endDate) &&
    endDate >= startDate
  );
}

export function selectDateRange(
  current: DateRangeValue,
  selectedDate: string,
): DateRangeValue {
  if (!isIsoCalendarDate(selectedDate)) return current;

  if (!current.startDate || current.endDate) {
    return { startDate: selectedDate, endDate: "" };
  }

  if (selectedDate < current.startDate) {
    return { startDate: selectedDate, endDate: "" };
  }

  return {
    startDate: current.startDate,
    endDate: selectedDate,
  };
}
