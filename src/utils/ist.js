export const IST_TIME_ZONE = "Asia/Kolkata";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const partsToObject = (parts) =>
  Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));

export const getISTDate = (instant = new Date()) => {
  const { year, month, day } = partsToObject(dateFormatter.formatToParts(instant));
  return `${year}-${month}-${day}`;
};

export const getISTTime = (instant = new Date()) => {
  const { hour, minute } = partsToObject(timeFormatter.formatToParts(instant));
  return `${hour}:${minute}`;
};

// Date-only values are calendar dates, not instants. UTC is used solely for safe
// calendar arithmetic so the result never depends on the server's local timezone.
export const addISTDays = (dateString, days) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

export const getISTTomorrow = () => addISTDays(getISTDate(), 1);

export const isValidDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
