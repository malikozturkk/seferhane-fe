import "server-only"
import { z } from "zod"
import type { StatCard } from "@/shared/contracts/common"
import {
  tripClosingSchema,
  tripCostSchema,
  tripCreateSchema,
  tripDocumentUploadSchema,
  tripExpenseSchema,
  tripInvoiceSchema,
  tripStatusSchema,
  type TripView,
} from "@/shared/contracts/operations"
import { now, today } from "@/shared/lib/clock"
import { money } from "@/shared/lib/format"
import { newId } from "../db/ids"
import { badRequest, notFound } from "../http/errors"
import { defineHandler } from "../http/handler"
import { listItems } from "../http/list"
import { createRouter } from "../http/router"
import { logActivity, timelineFor } from "../services/activity"
import { DELIVERED_STATUSES, tripView } from "../services/derive"
import { closeTrip, createTrip, getTrip, setTripStatus } from "../services/trips"

const ACTIVE = ["Yolda", "Yüklemede", "Planlandı", "Şoföre iletildi"]

export const tripsRouter = createRouter({
  "GET /": defineHandler({ permission: "trips:view" }, ({ data, query, searchParams }) => {
    const date = searchParams.get("date")
    const vehicleId = searchParams.get("vehicleId")
    const trips = data.trips
      .filter((t) => (!date || t.date === date) && (!vehicleId || t.vehicleId === vehicleId))
      .map(tripView)
    return listItems<TripView>(trips, query, {
      search: (t) => [t.number, t.customerName, t.plate, t.driverName, t.from, t.to],
      tabs: {
        "Aktif seferler": (t) => ACTIVE.includes(t.status),
        Planlandı: (t) => t.status === "Planlandı",
        "Evrak bekliyor": (t) => t.docsDone < t.docsTotal && DELIVERED_STATUSES.includes(t.status),
        Tamamlandı: (t) => t.status === "Tamamlandı",
        Yolda: (t) => t.status === "Yolda",
        Yüklemede: (t) => t.status === "Yüklemede",
        "Teslim edildi": (t) => t.status === "Teslim edildi",
      },
      filters: { missingDocs: (t) => t.docsDone < t.docsTotal },
      sorts: {
        number: (t) => t.number,
        customer: (t) => t.customerName,
        status: (t) => t.status,
        time: (t) => `${t.date} ${t.time}`,
        revenue: (t) => t.revenue,
      },
      defaultSort: (a, b) => (b.date + b.number).localeCompare(a.date + a.number),
    })
  }),

  "GET /stats": defineHandler({ permission: "trips:view" }, ({ data }) => {
    const trips = data.trips.map(tripView)
    const stats: StatCard[] = [
      { label: "Tüm operasyonlar", value: String(trips.length), caption: "bu görünümde" },
      { label: "Aktif seferler", value: String(trips.filter((t) => ["Yolda", "Yüklemede"].includes(t.status)).length), caption: "yolda & yüklemede" },
      { label: "Evrak bekleyen", value: String(trips.filter((t) => t.docsDone < t.docsTotal).length), caption: "dosya" },
      { label: "Tamamlanan", value: String(trips.filter((t) => t.docsDone === t.docsTotal).length), caption: "faturaya hazır" },
    ]
    return stats
  }),

  "POST /": defineHandler(
    { permission: "trips:create", body: tripCreateSchema.extend({ quoteId: z.string().optional() }) },
    ({ data, user, body }) => {
      const customer = data.customers.find((c) => c.id === body.customerId)
      if (!customer) throw badRequest("Müşteri bulunamadı.", { customerId: "Müşteri seçin" })
      const trip = createTrip(data, user, { ...body, customerName: customer.name })
      if (body.quoteId) {
        const quote = data.quotes.find((q) => q.id === body.quoteId)
        if (quote) Object.assign(quote, { status: "Sefere dönüştü", tripId: trip.id, updatedAt: now() })
      }
      return tripView(trip)
    },
  ),

  "GET /:id": defineHandler({ permission: "trips:view" }, ({ data, params }) => {
    const trip = getTrip(data, params.id)
    const vehicle = data.vehicles.find((v) => v.id === trip.vehicleId) ?? null
    const driver = data.employees.find((e) => e.id === trip.driverId) ?? null
    const claims = data.claims.filter((c) => c.relatedRef === trip.number)
    return { trip: tripView(trip), vehicle, driver, claims, ...timelineFor(data, "trip", trip.id) }
  }),

  "PATCH /:id/status": defineHandler({ permission: "trips:update", body: tripStatusSchema }, ({ data, user, params, body }) =>
    tripView(setTripStatus(data, user, getTrip(data, params.id), body.status)),
  ),

  "POST /:id/close": defineHandler({ permission: "trips:approve" }, ({ data, user, params }) =>
    tripView(closeTrip(data, user, getTrip(data, params.id))),
  ),

  "POST /:id/documents": defineHandler({ permission: "trips:update", body: tripDocumentUploadSchema }, ({ data, user, params, body }) => {
    const trip = getTrip(data, params.id)
    const doc = trip.documents.find((d) => d.name === body.name)
    if (!doc) throw notFound("Belge şablonda yok.")
    Object.assign(doc, { uploaded: true, fileName: body.fileName, size: body.size, uploadedAt: now(), version: doc.uploaded ? doc.version + 1 : 1 })
    const done = trip.documents.filter((d) => d.uploaded).length
    if (trip.checklist[2]) trip.checklist[2].done = done >= 2
    if (doc.name.includes("POD") && trip.status === "Teslim edildi" && done < trip.documents.length) trip.status = "Evrak bekliyor"
    trip.updatedAt = now()
    logActivity(data, user.name, { type: "trip", id: trip.id, label: trip.number }, "document", `${doc.name} dosyaya eklendi (${body.fileName}). Kaynak: WhatsApp fotoğrafı.`)
    return tripView(trip)
  }),

  "POST /:id/costs": defineHandler({ permission: "trips:update", body: tripCostSchema }, ({ data, user, params, body }) => {
    const trip = getTrip(data, params.id)
    trip.costItems.push({ id: newId("cst"), name: body.name, amount: body.amount, source: "Manuel" })
    trip.updatedAt = now()
    logActivity(data, user.name, { type: "trip", id: trip.id, label: trip.number }, "cost", `Gider eklendi: ${body.name} · ${money(body.amount)}.`)
    return tripView(trip)
  }),

  "PATCH /:id/checklist": defineHandler(
    { permission: "trips:update", body: z.object({ index: z.number().int().min(0), done: z.boolean() }) },
    ({ data, params, body }) => {
      const trip = getTrip(data, params.id)
      if (!trip.checklist[body.index]) throw notFound("Kontrol maddesi bulunamadı.")
      trip.checklist[body.index].done = body.done
      return tripView(trip)
    },
  ),

  "PUT /:id/closing": defineHandler({ permission: "trips:update", body: tripClosingSchema }, ({ data, user, params, body }) => {
    const trip = getTrip(data, params.id)
    trip.closing = { expenses: [], invoices: [], ...trip.closing, ...body }
    trip.updatedAt = now()
    logActivity(data, user.name, { type: "trip", id: trip.id, label: trip.number }, "closing", "Sefer kapanış bilgileri kaydedildi.")
    return tripView(trip)
  }),

  "POST /:id/closing/expenses": defineHandler({ permission: "trips:update", body: tripExpenseSchema }, ({ data, user, params, body }) => {
    const trip = getTrip(data, params.id)
    trip.closing ??= { expenses: [], invoices: [] }
    trip.closing.expenses.push({ id: newId("exp"), name: body.name, amount: body.amount, date: trip.date || today() })
    logActivity(data, user.name, { type: "trip", id: trip.id, label: trip.number }, "expense", `Yol harcaması eklendi: ${body.name} · ${money(body.amount)}.`)
    return tripView(trip)
  }),

  "DELETE /:id/closing/expenses/:itemId": defineHandler({ permission: "trips:update" }, ({ data, params }) => {
    const trip = getTrip(data, params.id)
    if (trip.closing) trip.closing.expenses = trip.closing.expenses.filter((e) => e.id !== params.itemId)
    return tripView(trip)
  }),

  "POST /:id/closing/invoices": defineHandler({ permission: "trips:update", body: tripInvoiceSchema }, ({ data, user, params, body }) => {
    const trip = getTrip(data, params.id)
    trip.closing ??= { expenses: [], invoices: [] }
    trip.closing.invoices.push(...body.files.map((f) => ({ id: newId("inv"), name: f.name, size: f.size, date: today() })))
    logActivity(data, user.name, { type: "trip", id: trip.id, label: trip.number }, "invoice", `${body.files.length} sevkiyat faturası eklendi.`)
    return tripView(trip)
  }),

  "DELETE /:id/closing/invoices/:itemId": defineHandler({ permission: "trips:update" }, ({ data, params }) => {
    const trip = getTrip(data, params.id)
    if (trip.closing) trip.closing.invoices = trip.closing.invoices.filter((i) => i.id !== params.itemId)
    return tripView(trip)
  }),
})
