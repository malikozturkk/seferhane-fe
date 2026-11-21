import { z } from "zod"
import { isoDate, positiveAmount, requiredText, type Entity } from "./common"

/* ------------------------------------------------------------------ */
/* Customers, quotes, tariffs                                           */
/* ------------------------------------------------------------------ */

export interface Customer extends Entity {
  name: string
  /** MŞT-0012 */
  code: string
  sector: string
  taxNumber?: string
  contactName: string
  contactEmail?: string
  contactPhone?: string
  paymentTermDays: number
  slaNote?: string
  status: "Aktif" | "Pasif"
  tripsLastMonth: number
  revenueLastMonth: number
}

export const customerCreateSchema = z.object({
  name: requiredText("Firma adı"),
  sector: z.string().trim().optional().default(""),
  taxNumber: z.string().trim().regex(/^[0-9 ]*$/, "Yalnızca rakam").optional().default(""),
  contactName: requiredText("Yetkili"),
  contactEmail: z.union([z.literal(""), z.email("Geçerli bir e-posta girin")]).optional(),
  contactPhone: z.string().trim().optional().default(""),
  paymentTermDays: z.coerce.number().int().min(0).max(180).default(30),
})
export type CustomerCreateInput = z.input<typeof customerCreateSchema>

export const QUOTE_STATUSES = ["Taslak", "Onay bekliyor", "Kabul edildi", "Reddedildi", "Sefere dönüştü"] as const

export interface Quote extends Entity {
  /** TKL-2026-082 */
  number: string
  customerId?: string
  customerName: string
  from: string
  to: string
  details: string
  validUntil: string
  status: (typeof QUOTE_STATUSES)[number]
  price: number
  ownerName: string
  tripId?: string
}

export const quoteCreateSchema = z.object({
  customerName: requiredText("Müşteri"),
  customerId: z.string().optional(),
  from: requiredText("Çıkış"),
  to: requiredText("Varış"),
  details: z.string().trim().optional().default(""),
  validUntil: isoDate("Geçerlilik tarihi"),
  price: positiveAmount("Teklif tutarı"),
  paymentTermDays: z.coerce.number().int().min(0).default(30),
})
export type QuoteCreateInput = z.input<typeof quoteCreateSchema>

export interface Tariff extends Entity {
  code: string
  customerName: string
  from: string
  to: string
  vehicleType: string
  weightRange: string
  validUntil: string
  price: number
  status: "Aktif" | "Pasif"
  ownerName: string
}

export const tariffCreateSchema = z.object({
  customerName: requiredText("Müşteri"),
  from: requiredText("Çıkış"),
  to: requiredText("Varış"),
  vehicleType: requiredText("Araç tipi"),
  weightRange: z.string().trim().optional().default("0–24 ton"),
  validUntil: isoDate("Geçerlilik"),
  price: positiveAmount("Birim fiyat"),
})
export type TariffCreateInput = z.input<typeof tariffCreateSchema>

/* ------------------------------------------------------------------ */
/* Invoices (fatura hazırlığı) & receivables (tahsilat)                 */
/* ------------------------------------------------------------------ */

export interface InvoiceDraft extends Entity {
  /** FTR-2026-0124 */
  number: string
  customerName: string
  period: string
  tripIds: string[]
  tripCount: number
  documentCount: number
  amount: number
  status: "Evrak bekliyor" | "Aktarıma hazır" | "ERP’ye aktarıldı"
  date: string
  ownerName: string
}

export const invoiceCreateSchema = z.object({
  customerName: requiredText("Müşteri"),
  period: requiredText("Dönem"),
  amount: positiveAmount(),
  date: isoDate("Tarih"),
})
export type InvoiceCreateInput = z.input<typeof invoiceCreateSchema>

export interface Receivable extends Entity {
  invoiceNumber: string
  customerName: string
  title: string
  erpNumber: string
  dueDate: string
  amount: number
  collected: boolean
  ownerName: string
}

export interface ReceivableView extends Receivable {
  status: string
  overdueDays: number
}

/* ------------------------------------------------------------------ */
/* Ledger (cari hesaplar)                                                */
/* ------------------------------------------------------------------ */

export const LEDGER_DIRECTIONS = ["Alacak", "Borç"] as const

export interface LedgerPayment {
  id: string
  amount: number
  date: string
  note?: string
}

export interface LedgerEntry extends Entity {
  /** CR-2026-031 */
  number: string
  party: string
  direction: (typeof LEDGER_DIRECTIONS)[number]
  amount: number
  dueDate: string
  description: string
  payments: LedgerPayment[]
  settled: boolean
}

export type LedgerStatus = "Kapandı" | "Vadesi geçti" | "Bugün vadeli" | "Kısmi ödendi" | "Açık"

export interface LedgerEntryView extends LedgerEntry {
  paid: number
  remaining: number
  status: LedgerStatus
}

export const ledgerCreateSchema = z.object({
  party: requiredText("Cari"),
  direction: z.enum(LEDGER_DIRECTIONS),
  amount: positiveAmount(),
  dueDate: isoDate("Vade"),
  description: z.string().trim().optional().default(""),
})
export type LedgerCreateInput = z.input<typeof ledgerCreateSchema>

export const ledgerPaymentSchema = z.object({
  amount: positiveAmount("Ödenen tutar"),
  date: isoDate("Ödeme tarihi"),
  note: z.string().trim().optional(),
})
export type LedgerPaymentInput = z.input<typeof ledgerPaymentSchema>

export const ledgerAmountSchema = z.object({ amount: positiveAmount("Yeni toplam tutar") })

export interface LedgerSummary {
  receivable: number
  payable: number
  net: number
  due: LedgerEntryView[]
}

/* ------------------------------------------------------------------ */
/* Costs & profitability                                                 */
/* ------------------------------------------------------------------ */

export interface ProfitRow {
  key: string
  label: string
  sub: string
  revenue: number
  cost: number
  profit: number
  margin: number
  budgetVariance?: number
  tripId?: string
}

export interface CostOverview {
  revenue: number
  cost: number
  profit: number
  margin: number
  series: { week: TrendPoint[]; month: TrendPoint[] }
  breakdown: Array<{ label: string; value: number }>
}

export interface TrendPoint {
  label: string
  tooltipLabel: string
  revenue: number
  cost: number
}
