import { randomUUID } from "node:crypto"

/** Opaque entity id, e.g. `trp_3f9a1c2b`. */
export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 10)}`

/** Human readable sequential number, e.g. `SFR-2026-0843`. */
export function nextNumber(sequences: Record<string, number>, key: string, prefix: string, pad = 4) {
  sequences[key] = (sequences[key] ?? 0) + 1
  return `${prefix}-${String(sequences[key]).padStart(pad, "0")}`
}
