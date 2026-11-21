import { today } from "./clock"

const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
const MONTHS_LONG = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
]
const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]

/** ₺24.500 */
export const money = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`

/** %24,1 */
export const percent = (part: number, whole: number, digits = 1) =>
  whole ? `%${((part / whole) * 100).toFixed(digits).replace(".", ",")}` : "%0"

export const number = (n: number) => n.toLocaleString("tr-TR")

/** "03 Kas 2026" */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d} ${MONTHS_SHORT[Number(m) - 1] ?? m} ${y}`
}

/** "03.11.2026" */
export function formatDateNumeric(iso?: string | null): string {
  if (!iso) return "—"
  return iso.slice(0, 10).split("-").reverse().join(".")
}

/** "3 Kasım 2026, Salı" */
export function formatDateLong(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${WEEKDAYS[d.getUTCDay()]}`
}

/** "14:32" from an ISO timestamp. */
export function formatTime(iso?: string | null): string {
  if (!iso) return "—"
  return iso.length > 11 ? iso.slice(11, 16) : iso
}

/** "Bugün" / "Dün" / "02 Kas" relative label used in trip tables. */
export function relativeDay(iso?: string | null): string {
  if (!iso) return "—"
  const t = today()
  if (iso.slice(0, 10) === t) return "Bugün"
  const y = new Date(`${t}T00:00:00Z`)
  y.setUTCDate(y.getUTCDate() - 1)
  if (iso.slice(0, 10) === y.toISOString().slice(0, 10)) return "Dün"
  const [, m, d] = iso.slice(0, 10).split("-")
  return `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]}`
}

/** "Bugün, 14:32" or "02 Kas 2026, 14:32" */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—"
  const day = iso.slice(0, 10) === today() ? "Bugün" : formatDate(iso)
  return iso.length > 11 ? `${day}, ${formatTime(iso)}` : day
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr")

/** Locale-aware case-insensitive "contains". */
export const matches = (haystack: Array<string | number | undefined | null>, needle?: string) => {
  if (!needle) return true
  const n = needle.toLocaleLowerCase("tr")
  return haystack.some((h) => h != null && String(h).toLocaleLowerCase("tr").includes(n))
}
