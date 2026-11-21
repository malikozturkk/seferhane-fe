import { z } from "zod"
import { isoDate, optionalNumber, positiveAmount, requiredText, type Entity } from "./common"

/* ------------------------------------------------------------------ */
/* Trips (operasyon dosyaları)                                          */
/* ------------------------------------------------------------------ */

/** Plan §5.2 durum akışı. */
export const TRIP_STEPS = [
  "Planlandı",
  "Şoföre iletildi",
  "Yüklemede",
  "Yolda",
  "Teslim edildi",
  "Evrak tamam",
] as const

export const TRIP_STATUSES = [
  "Planlandı",
  "Şoföre iletildi",
  "Yüklemede",
  "Yolda",
  "Teslim edildi",
  "Evrak bekliyor",
  "Tamamlandı",
] as const
export type TripStatus = (typeof TRIP_STATUSES)[number]

export const OPERATION_TYPES = [
  "Yurt içi · Komple",
  "Yurt içi · Parsiyel",
  "Uluslararası",
  "ADR · Tehlikeli madde",
  "Frigo · Soğuk zincir",
] as const

export interface TripDocument {
  name: string
  uploaded: boolean
  fileName?: string
  size?: string
  uploadedAt?: string
  version: number
}

export interface TripCostItem {
  id: string
  name: string
  amount: number
  /** Where the cost came from (plan §7: traceable to source). */
  source: "Navlun" | "Yakıt" | "Şoför masrafı" | "HGS & köprü" | "Sabit maliyet payı" | "Manuel"
}

export interface TripClosing {
  fuelOut?: number
  fuelIn?: number
  fuelBought?: number
  km?: number
  advance?: number
  note?: string
  expenses: Array<{ id: string; name: string; amount: number; date?: string }>
  invoices: Array<{ id: string; name: string; size: string; date: string }>
}

export interface TripChecklistItem {
  label: string
  done: boolean
  assigneeName: string
}

export interface Trip extends Entity {
  /** SFR-2026-0842 */
  number: string
  date: string
  time: string
  customerId: string
  customerName: string
  from: string
  to: string
  vehicleId?: string
  plate: string
  driverId?: string
  driverName: string
  status: TripStatus
  operationType: (typeof OPERATION_TYPES)[number]
  /** "Komple · Tenteli" */
  type: string
  revenue: number
  costItems: TripCostItem[]
  documents: TripDocument[]
  checklist: TripChecklistItem[]
  cargo: {
    description: string
    weightVolume: string
    pallets: string
    customerRef: string
    note: string
  }
  loadingAddress: string
  deliveryAddress: string
  ownerName: string
  closing?: TripClosing
}

/** Derived fields the API adds to every trip it returns. */
export interface TripView extends Trip {
  cost: number
  profit: number
  margin: number
  docsDone: number
  docsTotal: number
}

export const tripCreateSchema = z.object({
  customerId: z.string().min(1, "Müşteri seçin"),
  operationType: z.enum(OPERATION_TYPES),
  from: requiredText("Yükleme şehri"),
  to: requiredText("Teslimat şehri"),
  date: isoDate("Teslimat tarihi"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Saat seçin"),
  cargoDescription: z.string().trim().optional().default(""),
  vehicleId: z.string().min(1, "Araç & şoför seçin"),
  revenue: positiveAmount("Navlun geliri"),
})
export type TripCreateInput = z.input<typeof tripCreateSchema>

export const tripStatusSchema = z.object({ status: z.enum(TRIP_STATUSES) })

export const tripCostSchema = z.object({
  name: requiredText("Gider adı"),
  amount: positiveAmount(),
})
export type TripCostInput = z.input<typeof tripCostSchema>

export const tripDocumentUploadSchema = z.object({
  name: requiredText("Belge"),
  fileName: requiredText("Dosya"),
  size: z.string().optional().default("1,2 MB"),
})

export const tripClosingSchema = z.object({
  fuelOut: optionalNumber("Çıkış yakıtı"),
  fuelIn: optionalNumber("Dönüş yakıtı"),
  fuelBought: optionalNumber("Yolda alınan yakıt"),
  km: optionalNumber("Kilometre"),
  advance: optionalNumber("Avans"),
  note: z.string().trim().optional(),
})
export type TripClosingInput = z.input<typeof tripClosingSchema>

export const tripExpenseSchema = z.object({
  name: requiredText("Harcama kalemi"),
  amount: positiveAmount(),
})
export type TripExpenseInput = z.input<typeof tripExpenseSchema>

export const tripInvoiceSchema = z.object({
  files: z.array(z.object({ name: z.string().min(1), size: z.string() })).min(1, "PDF seçin"),
})

/* ------------------------------------------------------------------ */
/* Planning                                                             */
/* ------------------------------------------------------------------ */

export interface Load extends Entity {
  customerName: string
  from: string
  to: string
  weight: string
  date: string
  time: string
  color: "blue" | "purple" | "green"
  revenue: number
  cost: number
}

export const loadCreateSchema = z.object({
  customerName: requiredText("Müşteri"),
  from: requiredText("Yükleme şehri"),
  to: requiredText("Teslimat şehri"),
  weight: requiredText("Yük"),
  date: isoDate("Tarih"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Saat seçin"),
  revenue: positiveAmount("Navlun geliri"),
})
export type LoadCreateInput = z.input<typeof loadCreateSchema>

export const assignSchema = z.object({
  loadId: z.string().min(1),
  vehicleId: z.string().min(1, "Araç & şoför seçin"),
  date: isoDate("Tarih"),
  driverNote: z.string().trim().max(500).optional(),
})
export type AssignInput = z.input<typeof assignSchema>

/** Vehicle row on the planning board. */
export interface PlanningResource {
  vehicleId: string
  plate: string
  driverName?: string
  status: string
  nextService: string
  /** "ok" | "warning" | "blocked" with human readable reason */
  compliance: { level: "ok" | "warning" | "blocked"; label: string }
}

export interface PlanningBoard {
  date: string
  week: boolean
  resources: PlanningResource[]
  trips: TripView[]
  loads: Load[]
  summary: { availableVehicles: number; availableDrivers: number; warnings: number; capacity: number }
}

/** `GET /planning/check` — availability & conflict check before assigning. */
export interface AssignmentCheck {
  ok: boolean
  level: "ok" | "warning" | "blocked"
  title: string
  detail: string
}
