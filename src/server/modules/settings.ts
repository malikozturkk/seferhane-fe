import "server-only"
import { PLAN_INFO, activePackages, PACKAGE_INFO } from "@/shared/auth/entitlements"
import { ALL_PERMISSIONS, type Permission } from "@/shared/auth/permissions"
import type { Activity } from "@/shared/contracts/common"
import {
  inviteUserSchema,
  roleInputSchema,
  tenantPreferencesSchema,
  tenantProfileSchema,
  updateUserSchema,
  type Role,
} from "@/shared/contracts/tenancy"
import { now } from "@/shared/lib/clock"
import { newId } from "../db/ids"
import type { UserRecord } from "../db/types"
import { badRequest, conflict, forbidden } from "../http/errors"
import { defineHandler, findOr404 } from "../http/handler"
import { listItems } from "../http/list"
import { createRouter } from "../http/router"
import { diff, logActivity } from "../services/activity"
import { publicUser } from "../services/auth"
import { DEMO_PASSWORD } from "../db/seed/helpers"

const officeUsers = (users: UserRecord[]) => users.filter((u) => u.kind === "internal" && u.status !== "Pasif")

export const settingsRouter = createRouter({
  /* Company ------------------------------------------------------- */
  "GET /company": defineHandler({ permission: "settings:view" }, ({ tenant }) => tenant),

  "PATCH /company": defineHandler({ permission: "settings:update", body: tenantProfileSchema }, ({ data, user, tenant, body }) => {
    const changes = diff(tenant, body)
    Object.assign(tenant, body, { updatedAt: now() })
    logActivity(data, user.name, { type: "tenant", id: tenant.id, label: tenant.name }, "update", "Şirket bilgileri güncellendi.", changes)
    return tenant
  }),

  "PATCH /preferences": defineHandler({ permission: "settings:update", body: tenantPreferencesSchema }, ({ data, user, tenant, body }) => {
    if (body.notifications) tenant.settings.notifications = { ...tenant.settings.notifications, ...body.notifications }
    if (body.templates) tenant.settings.templates = { ...tenant.settings.templates, ...body.templates }
    logActivity(data, user.name, { type: "tenant", id: tenant.id, label: tenant.name }, "update", body.templates ? "Şablon tercihleri güncellendi." : "Bildirim tercihleri güncellendi.")
    return tenant.settings
  }),

  /* Users ---------------------------------------------------------- */
  "GET /users": defineHandler({ permission: "users:view" }, ({ data, query }) =>
    listItems(data.users.map(publicUser), query, {
      search: (u) => [u.name, u.email, u.roleName, u.title],
      tabs: { "İç kullanıcılar": (u) => u.kind === "internal", "Dış kullanıcılar": (u) => u.kind === "external" },
      sorts: { name: (u) => u.name, role: (u) => u.roleName, status: (u) => u.status },
    }),
  ),

  "POST /users": defineHandler({ permission: "users:create", body: inviteUserSchema }, ({ data, user, tenant, body }) => {
    const role = findOr404(data.roles, body.roleId, "Rol")
    const email = body.email.toLowerCase()
    if (data.users.some((u) => u.email.toLowerCase() === email)) throw badRequest("Bu e-posta ile bir kullanıcı zaten var.", { email: "Bu e-posta kayıtlı" })
    const external = role.scope === "customer"
    if (external && !body.customerId) throw badRequest("Dış kullanıcı bir müşteriye bağlanmalıdır.", { customerId: "Müşteri seçin" })
    const limit = PLAN_INFO[tenant.plan].maxOfficeUsers
    if (!external && limit !== null && officeUsers(data.users).length >= limit)
      throw conflict(`${PLAN_INFO[tenant.plan].name} paketinde en fazla ${limit} ofis kullanıcısı olabilir. Ek kullanıcı için paketinizi yükseltin.`)
    const customer = body.customerId ? findOr404(data.customers, body.customerId, "Müşteri") : undefined
    const invited: UserRecord = {
      id: newId("usr"),
      tenantId: tenant.id,
      name: body.name || email.split("@")[0],
      email,
      kind: external ? "external" : "internal",
      roleId: role.id,
      roleName: role.name,
      title: role.name,
      customerId: customer?.id,
      customerName: customer?.name,
      status: "Davet edildi",
      password: DEMO_PASSWORD,
      createdAt: now(),
      updatedAt: now(),
    }
    data.users.push(invited)
    logActivity(data, user.name, { type: "user", id: invited.id, label: invited.email }, "invite", `${invited.email} kullanıcısı “${role.name}” rolüyle davet edildi.`)
    return publicUser(invited)
  }),

  "PATCH /users/:id": defineHandler({ permission: "users:update", body: updateUserSchema }, ({ data, user, tenant, params, body }) => {
    const target = findOr404(data.users, params.id, "Kullanıcı")
    if (target.id === user.id && (body.status === "Pasif" || body.roleId)) throw conflict("Kendi rolünüzü veya durumunuzu değiştiremezsiniz.")
    const changes: Activity["changes"] = []
    if (body.roleId) {
      const role = findOr404(data.roles, body.roleId, "Rol")
      if ((role.scope === "customer") !== (target.kind === "external")) throw badRequest("İç ve dış kullanıcı rolleri birbirine dönüştürülemez.")
      changes.push({ field: "role", from: target.roleName, to: role.name })
      target.roleId = role.id
      target.roleName = role.name
    }
    if (body.status) {
      const limit = PLAN_INFO[tenant.plan].maxOfficeUsers
      if (body.status === "Aktif" && target.kind === "internal" && target.status === "Pasif" && limit !== null && officeUsers(data.users).length >= limit)
        throw conflict(`${PLAN_INFO[tenant.plan].name} paketindeki ofis kullanıcısı limitine ulaşıldı.`)
      changes.push({ field: "status", from: target.status, to: body.status })
      target.status = body.status
    }
    target.updatedAt = now()
    logActivity(data, user.name, { type: "user", id: target.id, label: target.email }, "update", "Kullanıcı yetkileri güncellendi.", changes)
    return publicUser(target)
  }),

  /* Roles ---------------------------------------------------------- */
  "GET /roles": defineHandler({ permission: ["roles:view", "users:view"] }, ({ data }) =>
    data.roles.map((r) => ({ ...r, userCount: data.users.filter((u) => u.roleId === r.id).length })),
  ),

  "POST /roles": defineHandler({ permission: "roles:manage", body: roleInputSchema }, ({ data, user, tenant, body }) => {
    const permissions = sanitize(body.permissions)
    if (data.roles.some((r) => r.name.toLocaleLowerCase("tr") === body.name.toLocaleLowerCase("tr")))
      throw badRequest("Bu isimde bir rol var.", { name: "Bu isimde bir rol var" })
    const role: Role = {
      id: newId("role"),
      tenantId: tenant.id,
      key: `custom_${Date.now()}`,
      name: body.name,
      description: body.description || "Özel rol",
      scope: "all",
      permissions,
      system: false,
      createdAt: now(),
      updatedAt: now(),
    }
    data.roles.push(role)
    logActivity(data, user.name, { type: "role", id: role.id, label: role.name }, "create", `“${role.name}” rolü ${permissions.length} yetkiyle oluşturuldu.`)
    return role
  }),

  "PATCH /roles/:id": defineHandler({ permission: "roles:manage", body: roleInputSchema }, ({ data, user, params, body }) => {
    const role = findOr404(data.roles, params.id, "Rol")
    if (role.system) throw forbidden("Sistem rolleri düzenlenemez; kopyalayıp özel rol oluşturun.")
    const permissions = sanitize(body.permissions)
    const added = permissions.filter((p) => !role.permissions.includes(p)).length
    const removed = role.permissions.filter((p) => !permissions.includes(p)).length
    Object.assign(role, { name: body.name, description: body.description || role.description, permissions, updatedAt: now() })
    data.users.filter((u) => u.roleId === role.id).forEach((u) => (u.roleName = role.name))
    logActivity(data, user.name, { type: "role", id: role.id, label: role.name }, "update", `Rol yetkileri güncellendi (+${added} / −${removed}).`)
    return role
  }),

  "DELETE /roles/:id": defineHandler({ permission: "roles:manage" }, ({ data, user, params }) => {
    const role = findOr404(data.roles, params.id, "Rol")
    if (role.system) throw forbidden("Sistem rolleri silinemez.")
    if (data.users.some((u) => u.roleId === role.id)) throw conflict("Bu role atanmış kullanıcılar var. Önce kullanıcıları başka role taşıyın.")
    data.roles = data.roles.filter((r) => r.id !== role.id)
    logActivity(data, user.name, { type: "role", id: role.id, label: role.name }, "delete", `“${role.name}” rolü silindi.`)
  }),

  /* Audit ---------------------------------------------------------- */
  "GET /audit": defineHandler({ permission: "audit:view" }, ({ data, query }) =>
    listItems(data.activities, query, {
      search: (a) => [a.actorName, a.entityLabel, a.summary, a.action],
      sorts: { createdAt: (a) => a.createdAt, actor: (a) => a.actorName },
      defaultSort: (a, b) => b.createdAt.localeCompare(a.createdAt),
    }),
  ),

  /* Billing -------------------------------------------------------- */
  "GET /billing": defineHandler({ permission: "billing:view" }, ({ data, tenant }) => {
    const plan = PLAN_INFO[tenant.plan]
    return {
      plan: tenant.plan,
      planInfo: plan,
      addons: tenant.addons,
      packages: activePackages(tenant).map((p) => ({ key: p, ...PACKAGE_INFO[p] })),
      usage: {
        officeUsers: officeUsers(data.users).length,
        externalUsers: data.users.filter((u) => u.kind === "external").length,
        vehicles: data.vehicles.length,
        drivers: data.employees.filter((e) => e.role === "Şoför" && !e.endDate).length,
        storageGb: tenant.storageUsedGb,
      },
    }
  }),
})

function sanitize(input: string[]): Permission[] {
  const valid = new Set<string>(ALL_PERMISSIONS)
  const permissions = [...new Set(input)].filter((p) => valid.has(p)) as Permission[]
  if (!permissions.length) throw badRequest("En az bir geçerli yetki seçin.", { permissions: "En az bir yetki seçin" })
  return permissions
}
