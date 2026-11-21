import "server-only"
import { PLAN_INFO } from "@/shared/auth/entitlements"
import type { StatCard } from "@/shared/contracts/common"
import {
  EXPENSE_CATEGORIES,
  vehicleCreateSchema,
  vehicleExpenseSchema,
  vehicleUpdateSchema,
  type ExpenseCategory,
  type Vehicle,
  type VehicleCostSummary,
} from "@/shared/contracts/resources"
import { addDays, daysBetween, now, today } from "@/shared/lib/clock"
import { money } from "@/shared/lib/format"
import { newId } from "../db/ids"
import { badRequest, conflict } from "../http/errors"
import { defineHandler, findOr404 } from "../http/handler"
import { listItems } from "../http/list"
import { createRouter } from "../http/router"
import { diff, logActivity } from "../services/activity"

export const vehiclesRouter = createRouter({
  "GET /": defineHandler({ permission: ["fleet:view", "planning:view", "trips:create"] }, ({ data, query }) =>
    listItems<Vehicle>(data.vehicles, query, {
      search: (v) => [v.plate, v.model, v.driverName, v.body],
      tabs: { Araçlar: () => true },
      sorts: { plate: (v) => v.plate, km: (v) => v.km, status: (v) => v.status },
      filters: { action: (v) => v.status === "Bakımda" || Boolean(v.note) },
    }),
  ),

  "GET /stats": defineHandler({ permission: "fleet:view" }, ({ data }) => {
    const fleet = data.vehicles.filter((v) => v.kind !== "Hizmet aracı")
    const service = data.vehicles.length - fleet.length
    const maintenance = data.vehicles.filter((v) => v.status === "Bakımda")
    const monthStart = addDays(today(), -30)
    const monthly = data.expenses.filter((e) => e.date > monthStart).reduce((s, e) => s + e.amount, 0)
    const stats: StatCard[] = [
      {
        label: "Toplam araç",
        value: String(data.vehicles.length),
        caption: `${fleet.filter((v) => v.kind === "Çekici").length} çekici · ${fleet.filter((v) => v.kind === "Kamyon").length} kamyon · ${service} hizmet aracı`,
      },
      { label: "Sahada", value: String(fleet.filter((v) => ["Yolda", "Yüklemede"].includes(v.status)).length), caption: "yük aracı" },
      { label: "Bakımda", value: String(maintenance.length), caption: maintenance.map((v) => `${v.plate} · ${v.nextServiceLabel.split("· ")[1] ?? ""}`).join(", ") || "Bakımda araç yok" },
      { label: "Aylık filo maliyeti", value: money(monthly), caption: `Araç başı ${money(monthly / (data.vehicles.length || 1))}` },
    ]
    return stats
  }),

  "POST /": defineHandler({ permission: "fleet:create", body: vehicleCreateSchema }, ({ data, user, tenant, body }) => {
    const limit = PLAN_INFO[tenant.plan].maxVehicles
    if (limit !== null && data.vehicles.length >= limit)
      throw conflict(`${PLAN_INFO[tenant.plan].name} paketinde en fazla ${limit} araç tanımlanabilir. Ek araç için paketinizi yükseltin.`)
    const plate = body.plate.replace(/\s+/g, " ").trim()
    if (data.vehicles.some((v) => v.plate.replace(/\s/g, "") === plate.replace(/\s/g, "")))
      throw badRequest("Bu plaka zaten kayıtlı.", { plate: "Bu plaka zaten kayıtlı" })
    const driver = body.driverId ? data.employees.find((e) => e.id === body.driverId && !e.endDate) : undefined
    const vehicle: Vehicle = {
      id: newId("veh"),
      plate,
      model: body.model,
      year: body.year,
      kind: body.kind,
      body: body.kind === "Hizmet aracı" ? "Hizmet aracı" : `${body.kind} · Tenteli dorse`,
      capacity: body.capacity || "—",
      ownership: "Öz mal",
      driverId: driver?.id,
      driverName: driver?.name,
      assignmentUntil: body.assignmentUntil || undefined,
      km: body.km,
      status: "Müsait",
      nextServiceLabel: "Bakım planı yok",
      createdAt: now(),
      updatedAt: now(),
    }
    if (driver) Object.assign(driver, { vehicleId: vehicle.id, plate: vehicle.plate })
    data.vehicles.push(vehicle)
    logActivity(data, user.name, { type: "vehicle", id: vehicle.id, label: vehicle.plate }, "create", `${vehicle.plate} araç kaydı oluşturuldu.`)
    return vehicle
  }),

  "PATCH /:id": defineHandler({ permission: "fleet:update", body: vehicleUpdateSchema }, ({ data, user, params, body }) => {
    const vehicle = findOr404(data.vehicles, params.id, "Araç")
    if (body.km !== undefined && body.km < vehicle.km) throw badRequest("Kilometre geriye gidemez.", { km: "Kilometre geriye gidemez" })
    const changes = diff(vehicle, body as Partial<Vehicle>)
    if (body.driverId !== undefined) {
      const driver = body.driverId ? findOr404(data.employees, body.driverId, "Şoför") : undefined
      vehicle.driverId = driver?.id
      vehicle.driverName = driver?.name
      if (driver) Object.assign(driver, { vehicleId: vehicle.id, plate: vehicle.plate })
    }
    if (body.assignmentUntil !== undefined) vehicle.assignmentUntil = body.assignmentUntil || undefined
    if (body.km !== undefined) vehicle.km = body.km
    if (body.status) vehicle.status = body.status
    vehicle.updatedAt = now()
    logActivity(data, user.name, { type: "vehicle", id: vehicle.id, label: vehicle.plate }, "update", "Araç kartı güncellendi.", changes)
    return vehicle
  }),
})

/* ------------------------------------------------------------------ */
/* Araç maliyetleri                                                     */
/* ------------------------------------------------------------------ */

const PERIOD_DAYS: Record<string, number> = { week: 7, month: 30, year: 365, year3: 365 * 3, year5: 365 * 5 }
const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]

function bucketOf(date: string, span: number): { key: string; label: string } {
  if (span <= 14) return { key: date, label: `${Number(date.slice(8))} ${TR_MONTHS[Number(date.slice(5, 7)) - 1]}` }
  if (span <= 62) {
    const d = new Date(`${date}T00:00:00Z`)
    const monday = addDays(date, -((d.getUTCDay() + 6) % 7))
    return { key: monday, label: `${Number(monday.slice(8))} ${TR_MONTHS[Number(monday.slice(5, 7)) - 1]}` }
  }
  if (span <= 400) return { key: date.slice(0, 7), label: `${TR_MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(2, 4)}` }
  const q = Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1
  return { key: `${date.slice(0, 4)}-Q${q}`, label: `Ç${q} ${date.slice(2, 4)}` }
}

export const vehicleCostsRouter = createRouter({
  "GET /": defineHandler({ permission: "vehicleCosts:view" }, ({ data, searchParams }) => {
    const vehicleId = searchParams.get("vehicleId") || ""
    const category = (searchParams.get("category") || "") as ExpenseCategory | ""
    const period = searchParams.get("period") || "month"
    const to = period === "custom" ? searchParams.get("to") || today() : today()
    const from = period === "custom" ? searchParams.get("from") || addDays(today(), -90) : addDays(today(), -(PERIOD_DAYS[period] ?? 30) + 1)
    if (from > to) throw badRequest("Başlangıç tarihi bitişten sonra olamaz.")
    const limit = Number(searchParams.get("limit") || 300)
    const rows = data.expenses.filter(
      (e) => e.date >= from && e.date <= to && (!vehicleId || e.vehicleId === vehicleId) && (!category || e.category === category),
    )
    const total = rows.reduce((s, e) => s + e.amount, 0)
    const vehicleCount = vehicleId ? 1 : data.vehicles.length
    const span = Math.max(1, daysBetween(from, to) + 1)
    const byCat = new Map<ExpenseCategory, number>()
    rows.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount))
    const byCategory = [...byCat.entries()].map(([c, amount]) => ({ category: c, amount })).sort((a, b) => b.amount - a.amount)
    const buckets = new Map<string, { key: string; label: string; total: number; values: Partial<Record<ExpenseCategory, number>> }>()
    for (const e of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
      const b = bucketOf(e.date, span)
      const bucket = buckets.get(b.key) ?? { ...b, total: 0, values: {} }
      bucket.total += e.amount
      bucket.values[e.category] = (bucket.values[e.category] ?? 0) + e.amount
      buckets.set(b.key, bucket)
    }
    const summary: VehicleCostSummary = {
      from,
      to,
      total,
      perVehicle: total / vehicleCount,
      monthlyAverage: (total / span) * 30,
      vehicleCount,
      topCategory: byCategory[0] ? { ...byCategory[0], share: total ? byCategory[0].amount / total : 0 } : undefined,
      byCategory,
      buckets: [...buckets.values()],
      rows: rows.slice(0, limit),
      rowCount: rows.length,
    }
    return summary
  }),

  "GET /categories": defineHandler({ permission: "vehicleCosts:view" }, () => EXPENSE_CATEGORIES),

  "POST /": defineHandler({ permission: "vehicleCosts:create", body: vehicleExpenseSchema }, ({ data, user, body }) => {
    if (body.date > today()) throw badRequest("Gelecek tarihli masraf girilemez.", { date: "Bugün veya önceki bir tarih seçin" })
    const vehicle = findOr404(data.vehicles, body.vehicleId, "Araç")
    const expense = {
      id: newId("exp"),
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      date: body.date,
      category: body.category,
      description: body.description || body.category,
      amount: body.amount,
      receipt: body.receipt,
    }
    data.expenses.unshift(expense)
    data.expenses.sort((a, b) => (a.date < b.date ? 1 : -1))
    logActivity(data, user.name, { type: "vehicle", id: vehicle.id, label: vehicle.plate }, "expense", `${vehicle.plate} için ${money(body.amount)} ${body.category} masrafı eklendi.`)
    return expense
  }),
})
