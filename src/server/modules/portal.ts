import "server-only"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { magicLinkCreateSchema, portalComplaintSchema, type MagicLinkInfo } from "@/shared/contracts/management"
import type { TripView } from "@/shared/contracts/operations"
import { addDays, now, today } from "@/shared/lib/clock"
import { formatDate, money } from "@/shared/lib/format"
import { tenantUrl } from "@/shared/tenancy/host"
import { newId, nextNumber } from "../db/ids"
import { db } from "../db/store"
import type { TenantData } from "../db/types"
import { conflict, forbidden, notFound } from "../http/errors"
import { defineHandler, type TenantContext } from "../http/handler"
import { listItems } from "../http/list"
import { createRouter } from "../http/router"
import { logActivity } from "../services/activity"
import { claimView, tripView } from "../services/derive"

/**
 * Müşteri portalı (plan §5.17). External users only see records of their own
 * customer; costs, margins and internal comments are never returned.
 */
type PublicTrip = Omit<TripView, "costItems" | "cost" | "profit" | "margin" | "closing" | "ownerName">

const HIDDEN = ["costItems", "cost", "profit", "margin", "closing", "ownerName"] as const

function publicTrip(t: TripView): PublicTrip {
  return Object.fromEntries(Object.entries(t).filter(([k]) => !(HIDDEN as readonly string[]).includes(k))) as PublicTrip
}

const omit = <T extends object, K extends keyof T>(o: T, keys: K[]) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k as K))) as Omit<T, K>

function scope(ctx: TenantContext) {
  const customerId = ctx.user.customerId
  if (!customerId) throw forbidden("Hesabınız bir müşteriye bağlı değil.")
  const customer = ctx.data.customers.find((c) => c.id === customerId)
  if (!customer) throw forbidden("Bağlı müşteri bulunamadı.")
  return { customer, trips: ctx.data.trips.filter((t) => t.customerId === customerId).map(tripView) }
}

function ownTrip(ctx: TenantContext, id: string) {
  const trip = scope(ctx).trips.find((t) => t.id === id)
  if (!trip) throw notFound("Sefer bulunamadı.")
  return trip
}

/** Customer upload → pending document + panel notification (shared by portal & magic link). */
function receiveCustomerDocument(data: TenantData, tripId: string, fileName: string, by: string) {
  const trip = data.trips.find((t) => t.id === tripId)
  if (!trip) throw notFound("Sefer bulunamadı.")
  const missing = trip.documents.find((d) => !d.uploaded)
  data.documents.unshift({
    id: newId("doc"),
    name: missing?.name ?? "Müşteri belgesi",
    ownerType: "Operasyon",
    ownerRef: trip.number,
    responsibleName: trip.ownerName,
    expiresAt: null,
    expiryLabel: formatDate(today()),
    version: 1,
    approved: false,
    archived: false,
    fileName,
    source: "Müşteri portalı",
    createdAt: now(),
    updatedAt: now(),
  })
  data.notifications.unshift({
    id: newId("ntf"),
    title: "Müşteri belge yükledi",
    text: `${trip.number} · ${fileName} · ${by}`,
    href: "/documents?tab=Onay%20bekleyenler",
    tone: "green",
    icon: "file",
    createdAt: now(),
    readBy: [],
  })
  logActivity(data, by, { type: "trip", id: trip.id, label: trip.number }, "portal-upload", `Müşteri belge yükledi: ${fileName}. Kontrol için operasyon ekibine iletildi.`)
}

export const portalRouter = createRouter({
  "GET /overview": defineHandler({ auth: "external" }, (ctx) => {
    const { customer, trips } = scope(ctx)
    return {
      customer: { id: customer.id, name: customer.name, contactName: customer.contactName },
      company: { name: ctx.tenant.name, phone: ctx.tenant.phone },
      stats: {
        active: trips.filter((t) => ["Planlandı", "Şoföre iletildi", "Yüklemede", "Yolda"].includes(t.status)).length,
        onTime: "%100",
        lastMonth: customer.tripsLastMonth,
        missingDocs: trips.filter((t) => t.docsDone < t.docsTotal).length,
      },
    }
  }),

  "GET /trips": defineHandler({ auth: "external" }, (ctx) =>
    listItems(scope(ctx).trips.map(publicTrip), ctx.query, {
      search: (t) => [t.number, t.from, t.to, t.plate],
      defaultSort: (a, b) => (b.date + b.time).localeCompare(a.date + a.time),
    }),
  ),

  "GET /trips/:id": defineHandler({ auth: "external" }, (ctx) => {
    const trip = ownTrip(ctx, ctx.params.id)
    const events = ctx.data.activities
      .filter((a) => a.entityType === "trip" && a.entityId === trip.id && ["status", "create", "close", "portal-upload"].includes(a.action))
      .map((a) => ({ at: a.createdAt, text: a.summary }))
    return { trip: publicTrip(trip), events, contact: ctx.tenant.phone }
  }),

  "POST /trips/:id/documents": defineHandler({ auth: "external", body: z.object({ fileName: z.string().min(1, "Dosya seçin") }) }, (ctx) => {
    const trip = ownTrip(ctx, ctx.params.id)
    receiveCustomerDocument(ctx.data, trip.id, ctx.body.fileName, ctx.user.name)
    return { ok: true }
  }),

  "GET /quotes": defineHandler({ auth: "external" }, (ctx) => {
    const { customer } = scope(ctx)
    return ctx.data.quotes.filter((q) => q.customerId === customer.id || q.customerName === customer.name).map((q) => omit(q, ["ownerName"]))
  }),

  "POST /quotes/:id/accept": defineHandler({ auth: "external" }, (ctx) => {
    const { customer } = scope(ctx)
    const quote = ctx.data.quotes.find((q) => q.id === ctx.params.id && (q.customerId === customer.id || q.customerName === customer.name))
    if (!quote) throw notFound("Teklif bulunamadı.")
    if (quote.status !== "Onay bekliyor") throw conflict("Bu teklif onay beklemiyor.")
    quote.status = "Kabul edildi"
    quote.updatedAt = now()
    ctx.data.notifications.unshift({ id: newId("ntf"), title: `Teklif kabul edildi · ${customer.name}`, text: `${quote.number} · ${money(quote.price)} / sefer`, href: "/customers?tab=Teklifler", tone: "green", icon: "file", createdAt: now(), readBy: [] })
    logActivity(ctx.data, ctx.user.name, { type: "quote", id: quote.id, label: quote.number }, "approve", `Teklif müşteri portalından onaylandı (${ctx.user.name}).`)
    return quote
  }),

  "GET /reports": defineHandler({ auth: "external" }, (ctx) => {
    const { customer } = scope(ctx)
    return [
      { period: "Ekim 2026", trips: customer.tripsLastMonth, onTime: "%100", claims: 0 },
      { period: "Eylül 2026", trips: Math.max(1, customer.tripsLastMonth - 1), onTime: "%100", claims: 0 },
      { period: "Ağustos 2026", trips: customer.tripsLastMonth + 1, onTime: "%96", claims: 1 },
    ]
  }),

  "GET /complaints": defineHandler({ auth: "external" }, (ctx) => {
    const { customer } = scope(ctx)
    return ctx.data.claims.filter((c) => c.customerName === customer.name).map(claimView).map((c) => omit(c, ["ownerName", "insuranceNumber"]))
  }),

  "POST /complaints": defineHandler({ auth: "external", body: portalComplaintSchema }, (ctx) => {
    const { customer } = scope(ctx)
    const trip = ownTrip(ctx, ctx.body.tripId)
    const manager = ctx.data.users.find((u) => u.roleId.endsWith("_role_manager"))
    const claim = {
      id: newId("clm"),
      number: nextNumber(ctx.data.sequences, "claim", "HSR-2026", 3),
      title: `Müşteri şikâyeti · ${trip.number}`,
      kind: "Müşteri şikâyeti" as const,
      description: ctx.body.text,
      relatedRef: trip.number,
      customerName: customer.name,
      ownerName: manager?.name ?? trip.ownerName,
      slaDueAt: new Date(new Date(now()).getTime() + 24 * 3_600_000).toISOString(),
      amount: 0,
      status: "Yanıt bekliyor" as const,
      source: "Portal" as const,
      createdAt: now(),
      updatedAt: now(),
    }
    ctx.data.claims.unshift(claim)
    ctx.data.notifications.unshift({ id: newId("ntf"), title: `Portaldan şikâyet · ${customer.name}`, text: `${claim.number} · ${trip.number}`, href: "/claims", tone: "orange", icon: "alert", createdAt: now(), readBy: [] })
    logActivity(ctx.data, ctx.user.name, { type: "claim", id: claim.id, label: claim.number }, "create", "Müşteri portalından şikâyet açıldı.")
    return claimView(claim)
  }),
})

/* ------------------------------------------------------------------ */
/* Magic links (plan §6 #7) — signed, expiring, single use             */
/* ------------------------------------------------------------------ */

function linkInfo(token: string): { info: MagicLinkInfo; data: TenantData; tenantId: string; targetId: string } {
  const link = db.magicLinks.find((l) => l.token === token)
  if (!link) throw notFound("Bağlantı geçersiz.")
  const tenant = db.tenants.find((t) => t.id === link.tenantId)!
  const data = db.data[tenant.id]
  let target: MagicLinkInfo["target"]
  if (link.purpose === "document_upload") {
    const trip = data.trips.find((t) => t.id === link.targetId)
    if (!trip) throw notFound("Sefer bulunamadı.")
    target = { title: trip.number, subtitle: `${trip.customerName} · ${trip.from} → ${trip.to}`, missingDocuments: trip.documents.filter((d) => !d.uploaded).map((d) => d.name) }
  } else {
    const quote = data.quotes.find((q) => q.id === link.targetId)
    if (!quote) throw notFound("Teklif bulunamadı.")
    target = { title: `${quote.from} → ${quote.to}`, subtitle: `${quote.number} · ${quote.details} · ${formatDate(quote.validUntil)} tarihine kadar geçerli`, amount: quote.price }
  }
  return {
    info: { token, tenantName: tenant.name, purpose: link.purpose, expiresAt: link.expiresAt, used: Boolean(link.usedAt), target },
    data,
    tenantId: tenant.id,
    targetId: link.targetId,
  }
}

function usable(token: string) {
  const res = linkInfo(token)
  const link = db.magicLinks.find((l) => l.token === token)!
  if (link.usedAt) throw conflict("Bu bağlantı daha önce kullanıldı.")
  if (link.expiresAt < today()) throw conflict("Bağlantının süresi dolmuş. Yeni bağlantı isteyin.")
  return { ...res, link }
}

export const linksRouter = createRouter({
  "GET /:token": defineHandler({ auth: "public" }, ({ params }) => linkInfo(params.token).info),

  "POST /:token/upload": defineHandler({ auth: "public", body: z.object({ fileName: z.string().min(1, "Dosya seçin") }) }, ({ params, body }) => {
    const { data, targetId, link } = usable(params.token)
    if (link.purpose !== "document_upload") throw conflict("Bu bağlantı belge yükleme için değil.")
    receiveCustomerDocument(data, targetId, body.fileName, "Magic-link")
    link.usedAt = now()
    return { ok: true }
  }),

  "POST /:token/approve": defineHandler({ auth: "public" }, ({ params }) => {
    const { data, targetId, link } = usable(params.token)
    if (link.purpose !== "quote_approval") throw conflict("Bu bağlantı teklif onayı için değil.")
    const quote = data.quotes.find((q) => q.id === targetId)!
    quote.status = "Kabul edildi"
    quote.updatedAt = now()
    link.usedAt = now()
    data.notifications.unshift({ id: newId("ntf"), title: `Teklif onay linkiyle kabul edildi`, text: `${quote.number} · ${quote.customerName}`, href: "/customers?tab=Teklifler", tone: "green", icon: "file", createdAt: now(), readBy: [] })
    logActivity(data, "Magic-link", { type: "quote", id: quote.id, label: quote.number }, "approve", "Teklif girişsiz onay linkiyle kabul edildi.")
    return { ok: true }
  }),

  /** Panel: create a link for a trip (document upload) or quote (approval). */
  "POST /": defineHandler({ permission: "portal:create", body: magicLinkCreateSchema }, ({ tenant, data, user, body }) => {
    const exists = body.purpose === "document_upload" ? data.trips.some((t) => t.id === body.targetId) : data.quotes.some((q) => q.id === body.targetId)
    if (!exists) throw notFound("Hedef kayıt bulunamadı.")
    const token = randomUUID().replace(/-/g, "").slice(0, 20)
    db.magicLinks.unshift({ token, tenantId: tenant.id, purpose: body.purpose, targetId: body.targetId, expiresAt: addDays(today(), body.validDays) })
    logActivity(data, user.name, { type: "link", id: token, label: body.targetId }, "create", `${body.purpose === "document_upload" ? "Belge yükleme" : "Teklif onay"} bağlantısı oluşturuldu (${body.validDays} gün geçerli).`)
    return { token, url: tenantUrl(tenant.slug, `/link/${token}`), expiresAt: addDays(today(), body.validDays) }
  }),

  "GET /": defineHandler({ permission: "portal:view" }, ({ tenant }) =>
    db.magicLinks
      .filter((l) => l.tenantId === tenant.id)
      .map((l) => ({ ...l, url: tenantUrl(tenant.slug, `/link/${l.token}`), info: linkInfo(l.token).info.target })),
  ),
})
