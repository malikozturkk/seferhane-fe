import "server-only"
import type { AssignmentCheck, OPERATION_TYPES, Trip, TripStatus } from "@/shared/contracts/operations"
import type { TrendPoint } from "@/shared/contracts/commercial"
import { addDays, now, today } from "@/shared/lib/clock"
import { formatDate } from "@/shared/lib/format"
import { newId, nextNumber } from "../db/ids"
import type { TenantData, UserRecord } from "../db/types"
import { splitCost } from "../db/seed/alpcengiz"
import { conflict, notFound } from "../http/errors"
import { logActivity } from "./activity"
import { ACTIVE_TRIP_STATUSES, blockedVehicles, tripView } from "./derive"

type OperationType = (typeof OPERATION_TYPES)[number]

/** Tip bazlı zorunlu belge şablonları (plan §6 #3). */
export const DOCUMENT_TEMPLATES: Record<OperationType, string[]> = {
  "Yurt içi · Komple": ["Sevk irsaliyesi", "Kantar fişi", "Yükleme tutanağı", "Teslimat kanıtı (POD)"],
  "Yurt içi · Parsiyel": ["Sevk irsaliyesi", "Kantar fişi", "Yükleme tutanağı", "Teslimat kanıtı (POD)"],
  Uluslararası: ["CMR", "TIR karnesi", "Gümrük beyannamesi", "Teslimat kanıtı (POD)"],
  "ADR · Tehlikeli madde": ["Sevk irsaliyesi", "ADR taşıma evrakı", "Kantar fişi", "Teslimat kanıtı (POD)"],
  "Frigo · Soğuk zincir": ["Sevk irsaliyesi", "Sıcaklık kaydı", "Kantar fişi", "Teslimat kanıtı (POD)"],
}

const CHECKLIST = [
  "Araç ve şoför uygunluğunu doğrula",
  "Yükleme evraklarını kontrol et",
  "Kantar fişini dosyaya ekle",
  "Teslimat POD belgesini onayla",
]

const hours = (time: string) => Number(time.split(":")[0]) + Number(time.split(":")[1]) / 60

/** Uygunluk ve çakışma kontrolü (plan §6 #2) — one rule for planning, new trip and quote conversion. */
export function checkAssignment(data: TenantData, vehicleId: string, date: string, time: string, ignoreTripId?: string): AssignmentCheck {
  const vehicle = data.vehicles.find((v) => v.id === vehicleId)
  if (!vehicle) return { ok: false, level: "blocked", title: "Araç bulunamadı", detail: "Seçilen araç kayıtlı değil." }
  const blocked = blockedVehicles(data).get(vehicle.plate)
  if (blocked) return { ok: false, level: "blocked", title: "Yola çıkış uygun değil", detail: blocked }
  if (vehicle.status === "Bakımda")
    return { ok: false, level: "blocked", title: "Araç bakımda", detail: `${vehicle.plate} bakımda (${vehicle.nextServiceLabel}). Sefer ataması yapılamaz.` }
  if (!vehicle.driverId) return { ok: false, level: "blocked", title: "Şoför atanmamış", detail: `${vehicle.plate} için şoför ataması yok.` }
  const clash = data.trips.find(
    (t) =>
      t.id !== ignoreTripId &&
      t.vehicleId === vehicleId &&
      t.date === date &&
      ACTIVE_TRIP_STATUSES.includes(t.status) &&
      Math.abs(hours(t.time) - hours(time)) < 2,
  )
  if (clash)
    return {
      ok: false,
      level: "blocked",
      title: "Saat çakışması",
      detail: `${vehicle.plate}, ${clash.number} (${clash.time}) ile saat çakışması yaşıyor. Başka bir araç seçin.`,
    }
  const driver = data.employees.find((e) => e.id === vehicle.driverId)
  if (driver?.endDate) return { ok: false, level: "blocked", title: "Şoför ayrılmış", detail: `${driver.name} işten ayrıldı; yeni sefer atanamaz.` }
  return {
    ok: true,
    level: "ok",
    title: "Araç & şoför atamaya uygun",
    detail: "Belge geçerliliği kontrol edildi. Seçilen saat aralığında çakışma yok.",
  }
}

export interface NewTripInput {
  customerId?: string
  customerName: string
  operationType: OperationType
  from: string
  to: string
  date: string
  time: string
  vehicleId: string
  revenue: number
  cost?: number
  cargoDescription?: string
}

/** Creates a trip file from the type template (documents + checklist + tasks). */
export function createTrip(data: TenantData, actor: UserRecord, input: NewTripInput): Trip {
  const check = checkAssignment(data, input.vehicleId, input.date, input.time)
  if (!check.ok) throw conflict(check.detail)
  const vehicle = data.vehicles.find((v) => v.id === input.vehicleId)!
  const customer =
    (input.customerId && data.customers.find((c) => c.id === input.customerId)) ||
    data.customers.find((c) => c.name === input.customerName)
  const number = nextNumber(data.sequences, "trip", `SFR-${input.date.slice(0, 4)}`)
  const id = newId("trp")
  const body = input.operationType.includes("Frigo") ? "Frigo" : vehicle.body.includes("Açık") ? "Açık kasa" : "Tenteli"
  const trip: Trip = {
    id,
    number,
    date: input.date,
    time: input.time,
    customerId: customer?.id ?? "",
    customerName: customer?.name ?? input.customerName,
    from: input.from,
    to: input.to,
    vehicleId: vehicle.id,
    plate: vehicle.plate,
    driverId: vehicle.driverId,
    driverName: vehicle.driverName ?? "",
    status: "Planlandı",
    operationType: input.operationType,
    type: `${input.operationType.includes("Parsiyel") ? "Parsiyel" : "Komple"} · ${body}`,
    revenue: input.revenue,
    costItems: input.cost ? splitCost(id, input.cost) : [],
    documents: DOCUMENT_TEMPLATES[input.operationType].map((name) => ({ name, uploaded: false, version: 1 })),
    checklist: CHECKLIST.map((label, i) => ({ label, done: i === 0, assigneeName: actor.name })),
    cargo: { description: input.cargoDescription || "—", weightVolume: "—", pallets: "—", customerRef: "—", note: "" },
    loadingAddress: input.from,
    deliveryAddress: input.to,
    ownerName: actor.name,
    createdAt: now(),
    updatedAt: now(),
  }
  data.trips.unshift(trip)
  // Kontrol görevleri (plan §6 #9) — 3 görev per template.
  for (const [i, title] of ["Yükleme evraklarını kontrol et", "Kantar fişini dosyaya ekle", "Teslimat POD belgesini onayla"].entries()) {
    data.tasks.unshift({
      id: newId("tsk"),
      title: `${number} · ${title}`,
      description: "Sefer şablonundan otomatik oluşturuldu",
      source: `Otomatik görev · ${input.operationType} şablonu`,
      relatedRef: number,
      assigneeName: actor.name,
      dueDate: i === 2 ? addDays(input.date, 1) : input.date,
      priority: "Normal",
      status: "Bekliyor",
      checklist: [],
      createdAt: now(),
      updatedAt: now(),
    })
  }
  logActivity(data, actor.name, { type: "trip", id, label: number }, "create", `Sefer oluşturuldu: ${trip.customerName} · ${trip.from} → ${trip.to}.`)
  return trip
}

const VEHICLE_STATUS: Partial<Record<TripStatus, "Yolda" | "Yüklemede" | "Müsait">> = {
  Yüklemede: "Yüklemede",
  Yolda: "Yolda",
  "Teslim edildi": "Müsait",
  "Evrak bekliyor": "Müsait",
  Tamamlandı: "Müsait",
}

export function setTripStatus(data: TenantData, actor: UserRecord, trip: Trip, status: TripStatus) {
  if (status === "Tamamlandı") return closeTrip(data, actor, trip)
  const before = trip.status
  trip.status = status
  trip.updatedAt = now()
  const vehicle = data.vehicles.find((v) => v.id === trip.vehicleId)
  const vs = VEHICLE_STATUS[status]
  if (vehicle && vs && vehicle.status !== "Bakımda") vehicle.status = vs
  if ((status === "Yüklemede" || status === "Yolda") && trip.checklist[1]) trip.checklist[1].done = true
  logActivity(data, actor.name, { type: "trip", id: trip.id, label: trip.number }, "status", `Sefer durumu “${status}” olarak güncellendi.`, [
    { field: "status", from: before, to: status },
  ])
  return trip
}

/** Dosya "evrak tamam" olmadan kapanamaz; kapanınca fatura hazırlığına düşer (plan §5.3). */
export function closeTrip(data: TenantData, actor: UserRecord, trip: Trip) {
  const missing = trip.documents.filter((d) => !d.uploaded)
  if (missing.length)
    throw conflict(`Dosya kapatılamadı: teslimat kanıtı dahil tüm zorunlu belgeleri tamamlayın (${missing.map((d) => d.name).join(", ")}).`)
  trip.status = "Tamamlandı"
  trip.updatedAt = now()
  trip.checklist.forEach((c) => (c.done = true))
  const vehicle = data.vehicles.find((v) => v.id === trip.vehicleId)
  if (vehicle && vehicle.status !== "Bakımda") vehicle.status = "Müsait"
  logActivity(data, actor.name, { type: "trip", id: trip.id, label: trip.number }, "close", "Dosya kapatıldı. Fatura hazırlığına eklendi.")
  return trip
}

export function getTrip(data: TenantData, id: string) {
  const trip = data.trips.find((t) => t.id === id || t.number === id)
  if (!trip) throw notFound("Sefer bulunamadı.")
  return trip
}

/* Trend series -------------------------------------------------------- */

const WEEKDAY = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]

/** Son 7 gün: trips of a day override the historical aggregate for that day. */
export function weekSeries(data: TenantData): TrendPoint[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today(), i - 6)
    const trips = data.trips.filter((t) => t.date === date).map(tripView)
    const hist = data.history.daily[date] ?? { revenue: 0, cost: 0 }
    const revenue = trips.length ? trips.reduce((s, t) => s + t.revenue, 0) : hist.revenue
    const cost = trips.length ? trips.reduce((s, t) => s + t.cost, 0) : hist.cost
    const d = new Date(`${date}T00:00:00Z`)
    return { label: WEEKDAY[d.getUTCDay()], tooltipLabel: formatDate(date).slice(0, 6), revenue, cost }
  })
}

export function monthSeries(data: TenantData): TrendPoint[] {
  return data.history.weekly.length ? data.history.weekly : weekSeries(data)
}

export const sumSeries = (s: TrendPoint[]) => {
  const revenue = s.reduce((a, b) => a + b.revenue, 0)
  const cost = s.reduce((a, b) => a + b.cost, 0)
  return { revenue, cost, profit: revenue - cost }
}
