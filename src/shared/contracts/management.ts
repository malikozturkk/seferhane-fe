import { z } from "zod"
import { isoDate, requiredText, type Entity } from "./common"

/* ------------------------------------------------------------------ */
/* Tasks                                                                */
/* ------------------------------------------------------------------ */

export const TASK_STATUSES = ["Planlandı", "Bekliyor", "Devam ediyor", "Onay bekliyor", "Tamamlandı"] as const
export const TASK_PRIORITIES = ["Yüksek", "Normal", "Düşük"] as const

export interface Task extends Entity {
  title: string
  description: string
  relatedRef: string
  assigneeName: string
  dueDate: string
  dueTime?: string
  priority: (typeof TASK_PRIORITIES)[number]
  status: (typeof TASK_STATUSES)[number]
  checklist: Array<{ label: string; done: boolean }>
  /** "Otomatik görev · Belge süre kuralı" when created by the rule engine. */
  source?: string
}

export interface TaskView extends Task {
  overdue: boolean
  dueToday: boolean
  /** Badge text: "Gecikti", "Yüksek öncelik" or status. */
  displayStatus: string
}

export const taskCreateSchema = z.object({
  title: requiredText("Görev başlığı"),
  description: z.string().trim().optional().default(""),
  relatedRef: z.string().trim().optional().default(""),
  assigneeName: requiredText("Sorumlu"),
  dueDate: isoDate("Son tarih"),
  priority: z.enum(TASK_PRIORITIES).default("Normal"),
  checklist: z.array(z.string().trim().min(1)).optional().default([]),
})
export type TaskCreateInput = z.input<typeof taskCreateSchema>

export const taskUpdateSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  assigneeName: z.string().optional(),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })).optional(),
})

/* ------------------------------------------------------------------ */
/* Claims (hasar & şikâyet)                                              */
/* ------------------------------------------------------------------ */

export const CLAIM_KINDS = ["Yük hasarı", "Araç hasarı", "Müşteri şikâyeti", "Gecikme"] as const
export const CLAIM_STATUSES = ["Yanıt bekliyor", "İncelemede", "Tamamlandı"] as const

export interface Claim extends Entity {
  number: string
  title: string
  kind: (typeof CLAIM_KINDS)[number]
  description: string
  relatedRef: string
  customerName?: string
  ownerName: string
  /** SLA first-response deadline (ISO datetime) */
  slaDueAt: string
  amount: number
  status: (typeof CLAIM_STATUSES)[number]
  insuranceNumber?: string
  source?: "Panel" | "Portal"
}

export interface ClaimView extends Claim {
  slaLabel: string
}

export const claimCreateSchema = z.object({
  title: requiredText("Dosya başlığı"),
  kind: z.enum(CLAIM_KINDS),
  relatedRef: z.string().trim().optional().default(""),
  ownerName: requiredText("Sorumlu"),
  amount: z.coerce.number().min(0).default(0),
  description: z.string().trim().optional().default(""),
})
export type ClaimCreateInput = z.input<typeof claimCreateSchema>

/* ------------------------------------------------------------------ */
/* Messages                                                              */
/* ------------------------------------------------------------------ */

export interface Channel {
  id: string
  name: string
  kind: "channel" | "announcements" | "handover"
  memberCount: number
}

export interface Message extends Entity {
  channelId: string
  authorName: string
  text: string
  /** Announcements are forwarded to the drivers' WhatsApp group. */
  whatsapp?: "sent" | "pending"
}

export const messageCreateSchema = z.object({ text: requiredText("Mesaj").max(2000) })

/* ------------------------------------------------------------------ */
/* Reports                                                               */
/* ------------------------------------------------------------------ */

export interface ReportTemplate {
  id: string
  title: string
  description: string
  phase: "MVP" | "Faz 2" | "Faz 3"
  icon: string
}

export interface SavedReport extends Entity {
  templateId: string
  title: string
  from: string
  to: string
}

export interface ReportSchedule {
  templateId: string
  cron: string
  label: string
}

export interface ReportResult {
  templateId: string
  from: string
  to: string
  tripCount: number
  onTimeRate: string
  documentCompleteness: string
  rows: Array<{ trip: string; customer: string; revenue: number; cost: number }>
}

export const reportRangeSchema = z.object({ from: isoDate("Başlangıç"), to: isoDate("Bitiş") })

/* ------------------------------------------------------------------ */
/* Automation                                                            */
/* ------------------------------------------------------------------ */

export const RULE_OBJECTS = ["Belge", "Sefer", "Görev", "Hasar", "Araç"] as const
export const RULE_CONDITIONS = ["Bitişine kalan gün", "Durum değişikliği", "Gecikme saati", "Kalan kilometre"] as const
export const RULE_ACTIONS = ["Görev oluştur & sorumluya bildir", "Yöneticiye eskalasyon", "Dashboard’da işaretle"] as const

export interface AutomationRule extends Entity {
  name: string
  object: (typeof RULE_OBJECTS)[number]
  condition: (typeof RULE_CONDITIONS)[number]
  /** Human readable condition, e.g. "Bitişine ≤ 15 gün kaldığında" */
  conditionText: string
  threshold: number
  action: (typeof RULE_ACTIONS)[number]
  enabled: boolean
  library: boolean
  lastRunAt?: string
}

export interface RuleRun {
  id: string
  ruleId: string
  ruleName: string
  ranAt: string
  result: string
  status: "Başarılı" | "Hata"
  created: number
}

export const ruleCreateSchema = z.object({
  name: requiredText("Kural adı"),
  object: z.enum(RULE_OBJECTS),
  condition: z.enum(RULE_CONDITIONS),
  threshold: z.coerce.number().min(0, "Eşik 0 veya daha büyük olmalı"),
  action: z.enum(RULE_ACTIONS),
})
export type RuleCreateInput = z.input<typeof ruleCreateSchema>

/* ------------------------------------------------------------------ */
/* Notifications                                                         */
/* ------------------------------------------------------------------ */

export interface Notification {
  id: string
  title: string
  text: string
  /** Module route to open. */
  href: string
  tone: "orange" | "green" | "blue" | "purple"
  icon: "shield" | "file" | "truck" | "wallet" | "task" | "alert"
  createdAt: string
  read: boolean
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                             */
/* ------------------------------------------------------------------ */

export interface DashboardData {
  view: "executive" | "operations" | "me"
  metrics: Array<{
    key: string
    label: string
    value: string
    change: string
    foot: string
    href: string
    tone?: "warning"
  }>
  statusBreakdown: Array<{ status: string; count: number }>
  todayTripCount: number
  onTime: { rate: string; text: string }
  attention: Array<{
    key: string
    tone: "orange" | "purple" | "blue"
    title: string
    text: string
    href: string
    linkLabel: string
  }>
  attentionTotal: number
}

/* ------------------------------------------------------------------ */
/* Magic links (plan §6 #7)                                              */
/* ------------------------------------------------------------------ */

export interface MagicLinkInfo {
  token: string
  tenantName: string
  purpose: "document_upload" | "quote_approval"
  expiresAt: string
  used: boolean
  target: {
    title: string
    subtitle: string
    amount?: number
    missingDocuments?: string[]
  }
}

export const magicLinkCreateSchema = z.object({
  purpose: z.enum(["document_upload", "quote_approval"]),
  targetId: z.string().min(1),
  validDays: z.coerce.number().int().min(1).max(30).default(7),
})

export const portalComplaintSchema = z.object({
  tripId: z.string().min(1, "Sefer seçin"),
  text: requiredText("Şikâyet").min(10, "En az 10 karakter yazın"),
})
export type PortalComplaintInput = z.input<typeof portalComplaintSchema>

/* ------------------------------------------------------------------ */
/* Global search                                                         */
/* ------------------------------------------------------------------ */

export interface SearchResult {
  type: "trip" | "customer" | "vehicle" | "employee" | "document"
  id: string
  title: string
  subtitle: string
  href: string
}
