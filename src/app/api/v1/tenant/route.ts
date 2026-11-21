import type { DemoAccount, TenantPublic } from "@/shared/contracts/tenancy"
import { db } from "@/server/db/store"
import { notFound } from "@/server/http/errors"
import { defineHandler } from "@/server/http/handler"

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false"

/**
 * Public info about the workspace behind the current host (login screen).
 * In demo mode it also lists demo accounts so every role can be tried.
 */
export const GET = defineHandler({ auth: "public" }, ({ surface, tenant, data }) => {
  if (surface.kind === "platform") {
    const accounts: DemoAccount[] = DEMO_MODE
      ? db.platformUsers.map((u) => ({ email: u.email, name: u.name, roleName: u.roleName, kind: u.kind }))
      : []
    return { tenant: null, platform: true, demoAccounts: accounts }
  }
  if (!tenant || !data) throw notFound("Çalışma alanı bulunamadı.")
  const info: TenantPublic = { slug: tenant.slug, name: tenant.name, status: tenant.status }
  const accounts: DemoAccount[] = DEMO_MODE
    ? data.users
        .filter((u) => u.status === "Aktif")
        .map((u) => ({ email: u.email, name: u.name, roleName: u.roleName, kind: u.kind }))
    : []
  return { tenant: info, platform: false, demoAccounts: accounts }
})
