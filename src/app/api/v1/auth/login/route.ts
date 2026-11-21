import { loginSchema, type LoginResult, type LoginWorkspace } from "@/shared/contracts/tenancy"
import { apexHostOf, workspaceOrigin } from "@/shared/tenancy/host"
import { encodeHandoff } from "@/server/auth/session"
import { db } from "@/server/db/store"
import { ApiError } from "@/server/http/errors"
import { defineHandler } from "@/server/http/handler"

/**
 * Central sign-in (seferhane.com/login). Credentials are checked against every
 * workspace the e-mail belongs to; each match gets a one-time handoff URL on
 * its own subdomain, which sets the host-only session cookie there.
 */
export const POST = defineHandler({ auth: "public", body: loginSchema }, ({ req, body }) => {
  const email = body.email.toLowerCase()
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")
  const apex = apexHostOf(host)
  const next = parseNext(req.nextUrl.searchParams.get("next"))

  const workspaces: LoginWorkspace[] = []
  const blocked: string[] = []
  const entry = (slug: string | null, uid: string, tid: string | null, name: string, kind: LoginWorkspace["kind"]) => {
    const origin = workspaceOrigin(proto, apex, slug)
    const url = new URL("/api/v1/auth/callback", origin)
    url.searchParams.set("token", encodeHandoff(uid, tid, next?.origin === origin ? next.path : null))
    workspaces.push({ name, kind, host: new URL(origin).host, url: url.toString() })
  }

  const platformUser = db.platformUsers.find((u) => u.email.toLowerCase() === email && u.password === body.password)
  if (platformUser) {
    if (platformUser.status !== "Aktif") blocked.push("Hesabınız pasif durumda.")
    else entry(null, platformUser.id, null, platformUser.kind === "partner" ? "İş ortağı konsolu" : "Platform konsolu", "platform")
  }

  for (const tenant of db.tenants) {
    const user = db.data[tenant.id]?.users.find((u) => u.email.toLowerCase() === email && u.password === body.password)
    if (!user) continue
    if (tenant.status === "Askıda") blocked.push(`${tenant.name} çalışma alanı askıya alınmış.`)
    else if (user.status !== "Aktif") blocked.push(`${tenant.name} hesabınız pasif durumda. Yöneticinizle görüşün.`)
    else entry(tenant.slug, user.id, tenant.id, tenant.name, user.kind === "external" ? "portal" : "panel")
  }

  if (workspaces.length) return { workspaces } satisfies LoginResult
  if (blocked.length) throw new ApiError(403, "Giriş yapılamadı", blocked.join(" "))
  throw new ApiError(401, "Giriş başarısız", "E-posta veya şifre hatalı.", { password: "E-posta veya şifre hatalı." })
})

/** `next` must be an absolute http(s) URL on one of our subdomains; only its path is kept. */
function parseNext(raw: string | null) {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return { origin: url.origin, path: url.pathname + url.search }
  } catch {
    return null
  }
}
