import "server-only"
import { unstable_rethrow } from "next/navigation"
import { NextResponse, type NextRequest } from "next/server"
import type { z, ZodType } from "zod"
import { can, type AccessSubject } from "@/shared/auth/can"
import type { Permission, PlatformPermission } from "@/shared/auth/permissions"
import { listParamsSchema, type ParsedListParams } from "@/shared/contracts/common"
import type { Role, Tenant } from "@/shared/contracts/tenancy"
import { resolveHost, SESSION_COOKIE, type HostSurface } from "@/shared/tenancy/host"
import { decodeSession } from "../auth/session"
import { db } from "../db/store"
import type { TenantData, UserRecord } from "../db/types"
import { ApiError, forbidden, fromZod, notFound, unauthorized } from "./errors"

/**
 * - `public`   — no session (login, tenant lookup, magic links)
 * - `tenant`   — any user of the host tenant (internal or external)
 * - `internal` — office users of the host tenant (panel APIs)
 * - `external` — portal users (customers)
 * - `platform` — platform admins / partners on admin.<root>
 */
export type AuthMode = "public" | "tenant" | "internal" | "external" | "platform"

export interface HandlerContext<B = unknown> {
  req: NextRequest
  surface: HostSurface
  params: Record<string, string>
  query: ParsedListParams
  searchParams: URLSearchParams
  body: B
  tenant: Tenant | null
  data: TenantData | null
  user: UserRecord | null
  role: Role | null
  subject: AccessSubject | null
}

/** Narrowed context for tenant-scoped handlers. */
export interface TenantContext<B = unknown> extends HandlerContext<B> {
  tenant: Tenant
  data: TenantData
  user: UserRecord
  role: Role
  subject: AccessSubject
}

interface Options<S extends ZodType | undefined> {
  auth?: AuthMode
  /** Required permission(s) — any of them grants access. */
  permission?: Permission | PlatformPermission | Array<Permission | PlatformPermission>
  body?: S
}

type Body<S> = S extends ZodType ? z.output<S> : undefined

const LATENCY = Number(process.env.MOCK_LATENCY_MS ?? 180)

export function tenantBySlug(slug: string) {
  return db.tenants.find((t) => t.slug === slug) ?? null
}

/** Resolve tenant + session for the current request. */
export function resolveRequest(req: NextRequest) {
  const surface = resolveHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"))
  const slug = surface.kind === "tenant" ? surface.slug : req.headers.get("x-tenant-slug")
  const tenant = slug ? tenantBySlug(slug) : null
  const data = tenant ? db.data[tenant.id] ?? null : null
  const session = decodeSession(req.cookies.get(SESSION_COOKIE)?.value)

  let user: UserRecord | null = null
  let role: Role | null = null
  if (session) {
    if (session.tid && tenant && session.tid === tenant.id && data) {
      user = data.users.find((u) => u.id === session.uid && u.status === "Aktif") ?? null
      role = user ? data.roles.find((r) => r.id === user!.roleId) ?? null : null
    } else if (!session.tid && surface.kind === "platform") {
      user = db.platformUsers.find((u) => u.id === session.uid && u.status === "Aktif") ?? null
      role = user ? db.platformRoles.find((r) => r.id === user!.roleId) ?? null : null
    }
  }
  const subject: AccessSubject | null =
    user && role ? { permissions: role.permissions, entitlements: tenant ? { plan: tenant.plan, addons: tenant.addons } : null } : null
  return { surface, tenant, data, user, role, subject }
}

export function defineHandler<S extends ZodType | undefined = undefined, R = unknown>(
  options: Options<S>,
  fn: (ctx: TenantContext<Body<S>>) => Promise<R> | R,
) {
  return async (req: NextRequest, route: { params: Promise<Record<string, string | string[]>> }) => {
    try {
      if (LATENCY > 0) await new Promise((r) => setTimeout(r, LATENCY))
      const ctx = resolveRequest(req)
      const auth = options.auth ?? "internal"

      if (auth !== "public" && auth !== "platform") {
        if (!ctx.tenant) throw notFound("Çalışma alanı bulunamadı.")
        if (ctx.tenant.status === "Askıda") throw forbidden("Bu çalışma alanı askıya alınmış.")
      }
      if (auth !== "public") {
        if (!ctx.user || !ctx.role) throw unauthorized()
        if (auth === "platform" && ctx.surface.kind !== "platform") throw forbidden()
        if (auth === "internal" && ctx.user.kind !== "internal") throw forbidden("Bu alan yalnızca şirket ekibine açıktır.")
        if (auth === "external" && ctx.user.kind !== "external") throw forbidden("Bu alan yalnızca portal kullanıcılarına açıktır.")
      }
      if (options.permission) {
        const required = Array.isArray(options.permission) ? options.permission : [options.permission]
        if (!required.some((p) => can(ctx.subject, p))) throw forbidden()
      }

      const searchParams = req.nextUrl.searchParams
      const query = listParamsSchema.parse(Object.fromEntries(searchParams))
      let body: unknown = undefined
      if (options.body) {
        const raw = await req.json().catch(() => ({}))
        const parsed = options.body.safeParse(raw)
        if (!parsed.success) throw fromZod(parsed.error)
        body = parsed.data
      }
      const rawParams = await route.params
      const params = Object.fromEntries(
        Object.entries(rawParams ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.join("/") : decodeURIComponent(v)]),
      )

      const result = await fn({ ...ctx, req, params, query, searchParams, body } as TenantContext<Body<S>>)
      if (result instanceof Response) return result
      return result === undefined ? new NextResponse(null, { status: 204 }) : NextResponse.json(result)
    } catch (error) {
      // Let Next.js internal control-flow errors (dynamic usage during prerender, etc.) propagate.
      unstable_rethrow(error)
      if (error instanceof ApiError) return NextResponse.json(error.toJSON(), { status: error.status })
      console.error("[api]", error)
      return NextResponse.json(new ApiError(500, "Beklenmeyen hata", "İşlem tamamlanamadı.").toJSON(), { status: 500 })
    }
  }
}

/** Find by id within a collection or throw 404. */
export function findOr404<T extends { id: string }>(items: T[], id: string, label = "Kayıt"): T {
  const item = items.find((i) => i.id === id)
  if (!item) throw notFound(`${label} bulunamadı.`)
  return item
}
