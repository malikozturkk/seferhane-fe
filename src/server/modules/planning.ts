import "server-only"
import { assignSchema, loadCreateSchema, type PlanningBoard, type PlanningResource } from "@/shared/contracts/operations"
import { addDays, now, today } from "@/shared/lib/clock"
import { newId } from "../db/ids"
import { conflict, notFound } from "../http/errors"
import { defineHandler } from "../http/handler"
import { createRouter } from "../http/router"
import { logActivity } from "../services/activity"
import { blockedVehicles, documentStats, tripView } from "../services/derive"
import { checkAssignment, createTrip, setTripStatus } from "../services/trips"

export const planningRouter = createRouter({
  /** Board for a day (or 7 days from `date` when `week=1`). */
  "GET /board": defineHandler({ permission: "planning:view" }, ({ data, searchParams }) => {
    const date = searchParams.get("date") ?? today()
    const week = searchParams.get("week") === "1"
    const end = week ? addDays(date, 6) : date
    const blocked = blockedVehicles(data)
    const soon = documentStats(data).docs.filter((d) => d.ownerType === "Araç" && d.status.endsWith("kaldı"))
    const fleet = data.vehicles.filter((v) => v.kind !== "Hizmet aracı")
    const resources: PlanningResource[] = fleet.map((v) => {
      const block = blocked.get(v.plate)
      const warn = soon.find((d) => d.ownerRef === v.plate)
      return {
        vehicleId: v.id,
        plate: v.plate,
        driverName: v.driverName,
        status: v.status,
        nextService: v.nextServiceLabel,
        compliance: block
          ? { level: "blocked", label: "Muayene süresi doldu · Atama kapalı" }
          : warn
            ? { level: "warning", label: `${warn.name.replace("Zorunlu ", "")} ${warn.status}` }
            : { level: "ok", label: "● Uygun" },
      }
    })
    const trips = data.trips.filter((t) => t.date >= date && t.date <= end).map(tripView)
    const busyDrivers = new Set(
      data.trips.filter((t) => t.date === today() && ["Yolda", "Yüklemede"].includes(t.status)).map((t) => t.driverId),
    )
    const drivers = data.employees.filter((e) => e.role === "Şoför" && !e.endDate)
    const planned = fleet.filter((v) => data.trips.some((t) => t.vehicleId === v.id && t.date === date)).length
    const board: PlanningBoard = {
      date,
      week,
      resources,
      trips,
      loads: data.loads.filter((l) => l.date >= date && l.date <= end),
      summary: {
        availableVehicles: fleet.filter((v) => v.status === "Müsait" && !blocked.has(v.plate)).length,
        availableDrivers: drivers.filter((d) => !busyDrivers.has(d.id)).length,
        warnings: resources.filter((r) => r.compliance.level !== "ok").length,
        capacity: fleet.length ? Math.round((planned / fleet.length) * 100) : 0,
      },
    }
    return board
  }),

  "GET /check": defineHandler({ permission: "planning:view" }, ({ data, searchParams }) => {
    const vehicleId = searchParams.get("vehicleId") ?? ""
    const date = searchParams.get("date") ?? today()
    const time = searchParams.get("time") ?? "12:00"
    return checkAssignment(data, vehicleId, date, time)
  }),

  /** Yükü sefere ata — creates the trip and removes the load. */
  "POST /assign": defineHandler({ permission: "planning:create", body: assignSchema }, ({ data, user, body }) => {
    const load = data.loads.find((l) => l.id === body.loadId)
    if (!load) throw notFound("Yük talebi bulunamadı.")
    const customer = data.customers.find((c) => c.name === load.customerName)
    const trip = createTrip(data, user, {
      customerId: customer?.id,
      customerName: load.customerName,
      operationType: load.weight.includes("Frigo") ? "Frigo · Soğuk zincir" : "Yurt içi · Komple",
      from: load.from,
      to: load.to,
      date: body.date,
      time: load.time,
      vehicleId: body.vehicleId,
      revenue: load.revenue,
      cost: load.cost,
      cargoDescription: load.weight,
    })
    data.loads = data.loads.filter((l) => l.id !== load.id)
    if (body.driverNote) trip.cargo.note = body.driverNote
    return tripView(trip)
  }),

  "POST /loads": defineHandler({ permission: "planning:create", body: loadCreateSchema }, ({ data, user, body }) => {
    const colors = ["blue", "purple", "green"] as const
    const load = { ...body, id: newId("lod"), cost: Math.round(body.revenue * 0.75), color: colors[data.loads.length % 3], createdAt: now(), updatedAt: now() }
    data.loads.unshift(load)
    logActivity(data, user.name, { type: "load", id: load.id, label: load.customerName }, "create", `Yük talebi eklendi: ${load.from} → ${load.to}.`)
    return load
  }),

  /** "Planı WhatsApp'tan ilet" — marks the day's planned trips as sent to drivers. */
  "POST /dispatch": defineHandler({ permission: "planning:update" }, ({ data, user, searchParams }) => {
    const date = searchParams.get("date") ?? today()
    const planned = data.trips.filter((t) => t.date === date && t.status === "Planlandı")
    if (!data.employees.some((e) => e.role === "Şoför" && !e.endDate)) throw conflict("İletilecek şoför bulunmuyor.")
    planned.forEach((t) => setTripStatus(data, user, t, "Şoföre iletildi"))
    const drivers = new Set(data.trips.filter((t) => t.date === date).map((t) => t.driverId)).size
    return { sent: planned.length, drivers }
  }),
})
