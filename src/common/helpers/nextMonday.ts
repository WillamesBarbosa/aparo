export function nextMondayAt9Utc(): string {
  const d = new Date();
  d.setUTCHours(9, 0, 0, 0);
  const diff = (8 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString();
}
