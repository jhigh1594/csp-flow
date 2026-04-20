export function getCurrentWeekStart(): string {
  const now = new Date();
  const dayUTC = now.getUTCDay();
  const diffUTC = dayUTC === 0 ? -6 : 1 - dayUTC;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffUTC),
  );
  return monday.toISOString().split("T")[0] as string;
}

export function subtractWeeks(dateStr: string, weeks: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - weeks * 7);
  return d.toISOString().split("T")[0] as string;
}
