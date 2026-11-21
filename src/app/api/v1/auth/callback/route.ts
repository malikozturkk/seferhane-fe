import { NextResponse, type NextRequest } from "next/server"
import { apexHostOf, resolveHost, SESSION_COOKIE } from "@/shared/tenancy/host"
import { now } from "@/shared/lib/clock"
import { consumeHandoff, encodeSession } from "@/server/auth/session"
import { db } from "@/server/db/store"
import { tenantBySlug } from "@/server/http/handler"
import { logActivity } from "@/server/services/activity"

/**
 * Second half of the central sign-in: runs on the workspace subdomain, burns
 * the handoff token and sets this host's own session cookie.
 */
export function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")
  const origin = `${proto}://${host}`
  const fail = () => NextResponse.redirect(`${proto}://${apexHostOf(host)}/login?error=handoff`)

  const handoff = consumeHandoff(req.nextUrl.searchParams.get("token"))
  if (!handoff) return fail()

  const surface = resolveHost(host)
  let destination = "/"
  if (surface.kind === "platform") {
    // Platform tokens never carry a tenant, tenant tokens only work on their own host.
    if (handoff.tid) return fail()
    const user = db.platformUsers.find((u) => u.id === handoff.uid && u.status === "Aktif")
    if (!user) return fail()
  } else if (surface.kind === "tenant") {
    const tenant = tenantBySlug(surface.slug)
    const data = tenant ? db.data[tenant.id] : null
    if (!tenant || !data || tenant.id !== handoff.tid || tenant.status === "Askıda") return fail()
    const user = data.users.find((u) => u.id === handoff.uid && u.status === "Aktif")
    if (!user) return fail()
    user.lastLoginAt = now()
    logActivity(data, user.name, { type: "user", id: user.id, label: user.name }, "login", "Oturum açtı.")
    if (user.kind === "external") destination = "/portal"
  } else {
    return fail()
  }

  const session = encodeSession(handoff.uid, handoff.tid)
  const response = NextResponse.redirect(new URL(handoff.next ?? destination, origin))
  response.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    maxAge: session.maxAge,
  })
  return response
}
