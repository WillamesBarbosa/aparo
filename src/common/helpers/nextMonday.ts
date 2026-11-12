export function nextMonday(hourUtc = 9): string {
  const d = new Date();
  d.setUTCHours(hourUtc, 0, 0, 0);
  const diff = (8 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString();
}
