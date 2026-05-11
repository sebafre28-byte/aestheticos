export function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB
}

export function addMinutes(iso: string, minutes: number): string {
  const date = new Date(iso)
  return new Date(date.getTime() + minutes * 60_000).toISOString()
}

export function durationMinutes(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000))
}

export function toQuarterHour(date: Date): Date {
  const copy = new Date(date)
  const rounded = Math.floor(copy.getMinutes() / 15) * 15
  copy.setMinutes(rounded, 0, 0)
  return copy
}
