export function getLastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function isFirstOrLastDayOfMonth(date: Date): boolean {
  const day = date.getDate();
  return day === 1 || day === getLastDayOfMonth(date);
}
