/** Local calendar date as YYYY-MM-DD. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDay(key: string, offset: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + offset));
}

export function formatDay(key: string): string {
  if (key === dayKey()) return "Today";
  if (key === shiftDay(dayKey(), -1)) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}
