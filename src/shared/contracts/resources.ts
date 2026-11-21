import { z } from "zod"
import { isoDate, optionalNumber, positiveAmount, requiredText, type Entity } from "./common"

/* ------------------------------------------------------------------ */
/* Vehicles                                                             */
/* ------------------------------------------------------------------ */

export const VEHICLE_KINDS = ["Çekici", "Kamyon", "Hizmet aracı"] as const
export const VEHICLE_STATUSES = ["Yolda", "Yüklemede", "Müsait", "Bakımda"] as const

export interface Vehicle extends Entity {
  plate: string
  model: string
  year: number
  kind: (typeof VEHICLE_KINDS)[number]
  body: string
  capacity: string
  ownership: "Öz mal" | "Kiralık"
  driverId?: string
  driverName?: string
  assignmentUntil?: string
  km: number
  status: (typeof VEHICLE_STATUSES)[number]
  nextServiceDate?: string
  nextServiceLabel: string
  note?: string
}

export const vehicleCreateSchema = z.object({
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^\d{2}\s?[A-ZÇĞİÖŞÜ]{1,3}\s?\d{2,4}$/, "Plaka formatı: 34 ABC 123"),
  model: requiredText("Marka / model"),
  year: z.coerce.number().int().min(1990, "1990 veya sonrası").max(2027, "2027 veya öncesi"),
  kind: z.enum(VEHICLE_KINDS),
  capacity: z.string().trim().optional().default(""),
  driverId: z.string().optional(),
  assignmentUntil: z.union([z.literal(""), isoDate("Atama bitiş tarihi")]).optional(),
  km: z.coerce.number().int().min(0, "Kilometre negatif olamaz"),
})
export type VehicleCreateInput = z.input<typeof vehicleCreateSchema>

export const vehicleUpdateSchema = z.object({
  driverId: z.string().nullable().optional(),
  assignmentUntil: z.union([z.literal(""), isoDate("Atama bitiş tarihi")]).optional(),
  km: z.coerce.number().int().min(0).optional(),
  status: z.enum(VEHICLE_STATUSES).optional(),
})

/* ------------------------------------------------------------------ */
/* Employees (drivers are records, not users)                           */
/* ------------------------------------------------------------------ */

export const EMPLOYEE_ROLES = ["Şirket yöneticisi", "Müdür", "Ofis çalışanı", "Şoför"] as const
export const SRC_TYPES = ["Belirtilmedi", "SRC 3", "SRC 4", "SRC 3 + SRC 4"] as const

export interface Employee extends Entity {
  name: string
  role: (typeof EMPLOYEE_ROLES)[number]
  phone: string
  email?: string
  vehicleId?: string
  plate?: string
  startDate: string
  /** Exit date — record is deactivated, never deleted. */
  endDate?: string
  src?: string
  srcExpiry?: string
  score?: number
  status: "Aktif" | "Seferde" | "Müsait" | "İzinli" | "Ayrıldı"
  department: string
}

export const employeeCreateSchema = z.object({
  name: requiredText("Ad soyad"),
  role: z.enum(EMPLOYEE_ROLES),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{10,}$/, "Geçerli bir telefon girin"),
  email: z.union([z.literal(""), z.email("Geçerli bir e-posta girin")]).optional(),
  startDate: isoDate("İşe giriş tarihi"),
  vehicleId: z.string().optional(),
  src: z.enum(SRC_TYPES).optional(),
})
export type EmployeeCreateInput = z.input<typeof employeeCreateSchema>

export const employeeExitSchema = z.object({ endDate: isoDate("İşe çıkış tarihi") })

/* ------------------------------------------------------------------ */
/* Documents & compliance                                               */
/* ------------------------------------------------------------------ */

export const DOCUMENT_OWNER_TYPES = ["Araç", "Şoför", "Şirket", "Müşteri sözleşmesi", "Operasyon"] as const

export type DocumentStatus = "Geçerli" | "Süresi doldu" | "Onay bekliyor" | `${number} gün kaldı`

export interface ComplianceDocument extends Entity {
  name: string
  ownerType: (typeof DOCUMENT_OWNER_TYPES)[number]
  /** Plate, driver name, company, customer or trip number. */
  ownerRef: string
  responsibleName: string
  /** ISO expiry date; null for unlimited documents. */
  expiresAt: string | null
  /** Shown instead of a date when `expiresAt` is null ("Süresiz", "Yıllık"). */
  expiryLabel?: string
  version: number
  approved: boolean
  archived: boolean
  fileName?: string
  source?: string
}

export interface DocumentView extends ComplianceDocument {
  status: DocumentStatus
  daysLeft: number | null
}

export const documentCreateSchema = z.object({
  name: requiredText("Belge adı"),
  ownerType: z.enum(DOCUMENT_OWNER_TYPES),
  ownerRef: requiredText("İlişkili kayıt"),
  responsibleName: requiredText("Sorumlu"),
  expiresAt: isoDate("Bitiş tarihi"),
  fileName: requiredText("Dosya"),
  description: z.string().trim().optional(),
})
export type DocumentCreateInput = z.input<typeof documentCreateSchema>

export interface PermitQuota extends Entity {
  country: string
  code: string
  kind: string
  year: number
  total: number
  used: number
  responsibleName: string
}

/* ------------------------------------------------------------------ */
/* Vehicle expenses (Araç maliyetleri)                                  */
/* ------------------------------------------------------------------ */

export const EXPENSE_CATEGORIES = [
  "Yakıt",
  "Bakım",
  "Lastik",
  "Muayene",
  "Kasko",
  "Trafik sigortası",
  "HGS & köprü",
  "Ceza",
  "Diğer",
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface VehicleExpense {
  id: string
  vehicleId: string
  plate: string
  date: string
  category: ExpenseCategory
  description: string
  amount: number
  receipt?: string
}

export const vehicleExpenseSchema = z.object({
  vehicleId: z.string().min(1, "Araç seçin"),
  category: z.enum(EXPENSE_CATEGORIES),
  date: isoDate("Tarih"),
  amount: positiveAmount(),
  description: z.string().trim().optional().default(""),
  receipt: z.string().optional(),
})
export type VehicleExpenseInput = z.input<typeof vehicleExpenseSchema>

export interface VehicleCostSummary {
  from: string
  to: string
  total: number
  perVehicle: number
  monthlyAverage: number
  vehicleCount: number
  topCategory?: { category: ExpenseCategory; amount: number; share: number }
  byCategory: Array<{ category: ExpenseCategory; amount: number }>
  buckets: Array<{ key: string; label: string; total: number; values: Partial<Record<ExpenseCategory, number>> }>
  rows: VehicleExpense[]
  rowCount: number
}

/* ------------------------------------------------------------------ */
/* Generic secondary records (Faz 2 tabs).                              */
/* Each `kind` maps to its own backend table later; the UI is config    */
/* driven so a new kind needs no new screen.                            */
/* ------------------------------------------------------------------ */

export const RECORD_KINDS = [
  "quality.audit",
  "quality.nonconformity",
  "quality.training",
  "quality.sop",
  "fleet.maintenance",
  "fleet.service",
  "fleet.tyre",
  "fleet.fuelFine",
  "people.timesheet",
  "people.advance",
  "people.abroad",
  "customers.note",
  "invoices.erpExport",
  "tasks.template",
] as const
export type RecordKind = (typeof RECORD_KINDS)[number]

export interface WorkRecord extends Entity {
  kind: RecordKind
  title: string
  subtitle: string
  /** Related entity (plate, trip number, code…) */
  ref: string
  ownerName: string
  date?: string
  /** Free text detail when a date is not the right column (e.g. "720 km kaldı"). */
  detail?: string
  status: string
  amount?: number
  amountLabel?: string
  description?: string
  /** Audit checklist (quality) */
  checklist?: boolean[]
  rootCause?: string
}

export const workRecordCreateSchema = z.object({
  kind: z.enum(RECORD_KINDS),
  title: requiredText("Kayıt başlığı"),
  ref: z.string().trim().optional().default(""),
  ownerName: requiredText("Sorumlu"),
  date: isoDate("Tarih"),
  amount: optionalNumber("Tutar"),
  description: z.string().trim().optional().default(""),
})
export type WorkRecordCreateInput = z.input<typeof workRecordCreateSchema>

export const workRecordUpdateSchema = z.object({
  status: z.string().optional(),
  checklist: z.array(z.boolean()).optional(),
  rootCause: z.string().optional(),
})
