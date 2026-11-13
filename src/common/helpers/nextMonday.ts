export function nextWeekday(weekday: number, hourUtc = 9): string {
  const d = new Date();
  d.setUTCHours(hourUtc, 0, 0, 0);
  const diff = (weekday - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString();
}

export const nextMonday = (hourUtc = 9) => nextWeekday(1, hourUtc);
