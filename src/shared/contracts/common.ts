import { z } from "zod"

/** Query string for every list endpoint. */
export const listParamsSchema = z.object({
  q: z.string().trim().optional(),
  tab: z.string().optional(),
  /** Quick filter key, e.g. "action" = "Aksiyon bekleyen kayıtlar". */
  filter: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(25),
})
export type ListParams = z.input<typeof listParamsSchema>
export type ParsedListParams = z.output<typeof listParamsSchema>

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** KPI card shown above lists (`StatGroup` / `MetricCard`). */
export interface StatCard {
  label: string
  value: string
  caption?: string
  tone?: "default" | "positive" | "warning"
}

/** RFC 7807 style error body returned by the API. */
export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail?: string
  /** Field errors (from Zod) keyed by dotted path. */
  errors?: Record<string, string>
}

export interface Entity {
  id: string
  createdAt: string
  updatedAt: string
}

/** Internal comment attached to any record ("İşlem geçmişi & iç yorumlar"). */
export interface Comment {
  id: string
  entityType: string
  entityId: string
  authorName: string
  text: string
  /** Internal comments are never shown to external (portal) users. */
  internal: boolean
  createdAt: string
}

export const commentInputSchema = z.object({
  text: z.string().trim().min(1, "Yorum boş olamaz").max(2000),
})
export type CommentInput = z.infer<typeof commentInputSchema>

/** Audit trail entry (plan §10: every write is logged). */
export interface Activity {
  id: string
  actorName: string
  entityType: string
  entityId: string
  entityLabel: string
  action: string
  summary: string
  changes?: Array<{ field: string; from: unknown; to: unknown }>
  createdAt: string
}

export const requiredText = (label: string) => z.string().trim().min(1, `${label} zorunludur`)
export const isoDate = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} geçerli bir tarih olmalı`)
/** Optional non-negative number; empty input → undefined (not 0). */
export const optionalNumber = (label = "Değer") =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ error: `${label} sayı olmalı` }).min(0, `${label} negatif olamaz`).optional(),
  )

export const positiveAmount = (label = "Tutar") =>
  z.coerce.number({ error: `${label} sayı olmalı` }).positive(`${label} 0'dan büyük olmalı`)
