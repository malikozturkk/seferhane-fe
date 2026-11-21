/**
 * Demo clock. Mock data is anchored to a fixed "today" so that derived states
 * (expiring documents, overdue ledger entries, SLA timers) stay coherent.
 * With a real backend this simply becomes `new Date()`.
 */
export const DEMO_TODAY = process.env.NEXT_PUBLIC_DEMO_TODAY ?? "2026-11-03"

const DAY = 86_400_000

/** Today as ISO date (YYYY-MM-DD). */
export function today(): string {
  return DEMO_TODAY
}

/** Current timestamp anchored to the demo date (keeps wall-clock time). */
export function now(): string {
  const t = new Date()
  return `${DEMO_TODAY}T${t.toISOString().slice(11)}`
}

export function toDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`)
}

export function addDays(iso: string, days: number): string {
  return new Date(toDate(iso).getTime() + days * DAY).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY)
}

/** Days remaining until `iso` relative to today (negative when past). */
export function daysUntil(iso: string): number {
  return daysBetween(today(), iso)
}
