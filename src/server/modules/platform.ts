import "server-only"
import { PACKAGE_INFO, PLAN_INFO, activePackages, type PackageKey, type PlanKey } from "@/shared/auth/entitlements"
import { partnerInputSchema, tenantCreateSchema, tenantUpdateSchema, type Partner, type Tenant } from "@/shared/contracts/tenancy"
import { now } from "@/shared/lib/clock"
import { tenantUrl } from "@/shared/tenancy/host"
import { newId } from "../db/ids"
import { buildRoles, makeUser } from "../db/seed/helpers"
import { db, emptyTenantData } from "../db/store"
import { badRequest, forbidden, notFound } from "../http/errors"
import { defineHandler } from "../http/handler"
import { createRouter } from "../http/router"

/** Monthly recurring revenue of a tenant: tier price + add-ons not included in the tier. */
export function mrr(t: Pick<Tenant, "plan" | "addons">) {
  const plan = PLAN_INFO[t.plan]
  const extra = t.addons.filter((a) => !plan.packages.includes(a)).reduce((s, a) => s + (PACKAGE_INFO[a].addonPrice ?? 0), 0)
  return (plan.monthlyPrice ?? 0) + extra
}

function tenantRow(t: Tenant) {
  const data = db.data[t.id]
  const partner = db.partners.find((p) => p.id === t.partnerId)
  return {
    ...t,
    url: tenantUrl(t.slug),
    partnerName: partner?.name,
    mrr: mrr(t),
    packages: activePackages(t),
    usage: {
      officeUsers: data?.users.filter((u) => u.kind === "internal" && u.status !== "Pasif").length ?? 0,
      vehicles: data?.vehicles.length ?? 0,
      trips: data?.trips.length ?? 0,
    },
  }
}

export const platformRouter = createRouter({
  "GET /overview": defineHandler({ auth: "platform", permission: "platform:tenants" }, () => {
    const total = db.tenants.reduce((s, t) => s + (t.status === "Askıda" ? 0 : mrr(t)), 0)
    return {
      tenants: db.tenants.length,
      active: db.tenants.filter((t) => t.status === "Aktif").length,
      trial: db.tenants.filter((t) => t.status === "Deneme").length,
      mrr: total,
      partners: db.partners.length,
      users: Object.values(db.data).reduce((s, d) => s + d.users.length, 0),
    }
  }),

  "GET /tenants": defineHandler({ auth: "platform", permission: "platform:tenants" }, () => db.tenants.map(tenantRow)),

  "POST /tenants": defineHandler({ auth: "platform", permission: "platform:tenants", body: tenantCreateSchema }, ({ body }) => {
    if (db.tenants.some((t) => t.slug === body.slug)) throw badRequest("Bu alt alan adı kullanımda.", { slug: "Bu alt alan adı kullanımda" })
    if (body.partnerId && !db.partners.some((p) => p.id === body.partnerId)) throw badRequest("Partner bulunamadı.", { partnerId: "Partner bulunamadı" })
    const id = newId("tnt")
    const tenant: Tenant = {
      id,
      slug: body.slug,
      name: body.name,
      legalName: body.legalName,
      taxOffice: "",
      taxNumber: "",
      address: "",
      phone: "",
      email: body.ownerEmail,
      site: "Merkez",
      departments: ["Yönetim"],
      plan: body.plan as PlanKey,
      addons: body.addons as PackageKey[],
      status: "Deneme",
      partnerId: body.partnerId || undefined,
      storageUsedGb: 0,
      settings: { notifications: { "Belge bitiş uyarıları · 30 / 15 / 7 gün": true, "Sefer durumu güncellemeleri": true }, templates: { "Yurt içi · Komple": true } },
      createdAt: now(),
      updatedAt: now(),
    }
    const data = emptyTenantData()
    data.roles = buildRoles(id)
    data.users = [makeUser(id, data.roles.find((r) => r.key === "owner")!, { id: newId("usr"), name: body.ownerName, email: body.ownerEmail.toLowerCase(), title: "Şirket yöneticisi", department: "Yönetim" })]
    db.tenants.push(tenant)
    db.data[id] = data
    return tenantRow(tenant)
  }),

  "PATCH /tenants/:id": defineHandler({ auth: "platform", permission: "platform:plans", body: tenantUpdateSchema }, ({ params, body }) => {
    const tenant = db.tenants.find((t) => t.id === params.id)
    if (!tenant) throw notFound("Tenant bulunamadı.")
    if (body.plan) tenant.plan = body.plan
    if (body.addons) tenant.addons = body.addons
    if (body.status) tenant.status = body.status
    if (body.partnerId !== undefined) tenant.partnerId = body.partnerId ?? undefined
    tenant.updatedAt = now()
    return tenantRow(tenant)
  }),

  "GET /partners": defineHandler({ auth: "platform", permission: "platform:partners" }, () =>
    db.partners.map((p) => {
      const tenants = db.tenants.filter((t) => t.partnerId === p.id)
      const revenue = tenants.reduce((s, t) => s + mrr(t), 0)
      return { ...p, tenantCount: tenants.length, mrr: revenue, commission: Math.round(revenue * p.commissionRate) }
    }),
  ),

  "POST /partners": defineHandler({ auth: "platform", permission: "platform:partners", body: partnerInputSchema }, ({ body }) => {
    const partner: Partner = { id: newId("prt"), ...body, commissionRate: body.commissionRate / 100, status: "Aktif", createdAt: now(), updatedAt: now() }
    db.partners.push(partner)
    return partner
  }),

  "PATCH /partners/:id": defineHandler({ auth: "platform", permission: "platform:partners", body: partnerInputSchema.partial() }, ({ params, body }) => {
    const partner = db.partners.find((p) => p.id === params.id)
    if (!partner) throw notFound("Partner bulunamadı.")
    Object.assign(partner, body, body.commissionRate !== undefined ? { commissionRate: body.commissionRate / 100 } : {}, { updatedAt: now() })
    return partner
  }),

  /** Partner user's own view: referred tenants + commission. */
  "GET /portfolio": defineHandler({ auth: "platform", permission: "partner:portfolio" }, ({ user }) => {
    const partner = db.partners.find((p) => p.id === user.partnerId)
    if (!partner) throw forbidden("Hesabınız bir iş ortağına bağlı değil.")
    const tenants = db.tenants.filter((t) => t.partnerId === partner.id).map(tenantRow)
    const revenue = tenants.reduce((s, t) => s + t.mrr, 0)
    return { partner, tenants, mrr: revenue, commission: Math.round(revenue * partner.commissionRate) }
  }),
})
