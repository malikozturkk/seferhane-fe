import { NextResponse, type NextRequest } from "next/server"
import { resolveHost, SESSION_COOKIE, SIGNIN_NEXT_HEADER } from "@/shared/tenancy/host"

/**
 * Multi-tenant routing (Next.js 16 Proxy):
 *   <slug>.<root>/path → /t/<slug>/path   (tenant panel, portal, magic links)
 *   admin.<root>/path  → /platform/path   (platform & partner console)
 *   <root>/path        → /path            (marketing)
 *
 * Sign-in is central: <root>/login. Workspace hosts send signed-out users
 * there with `next` = the absolute URL they asked for.
 *
 * Also performs the *optimistic* auth check (cookie present) — real
 * authorization happens in the API on every request.
 */
const TENANT_PUBLIC = [/^\/link\//]

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const host = req.headers.get("host") ?? req.nextUrl.host
  const surface = resolveHost(host)
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")
  /** Absolute URL on the *incoming* host (keeps the tenant subdomain). */
  const at = (path: string) => new URL(path, `${proto}://${host}`)
  const hasSession = req.cookies.has(SESSION_COOKIE)

  if (surface.kind === "apex") {
    // Internal route trees are only reachable through their own hosts.
    if (pathname.startsWith("/t/") || pathname.startsWith("/platform")) {
      return NextResponse.redirect(at("/"))
    }
    return NextResponse.next()
  }

  /** Central login on the apex (see api/v1/auth/signin for why this is a rewrite). */
  const centralLogin = (next: string | null) => {
    // Rewrites keep the original query string, so `next` travels as a header.
    const headers = new Headers(req.headers)
    headers.delete(SIGNIN_NEXT_HEADER)
    if (next) headers.set(SIGNIN_NEXT_HEADER, next)
    return NextResponse.rewrite(new URL("/api/v1/auth/signin", req.url), { request: { headers } })
  }
  if (pathname === "/login" || pathname === "/login/") {
    // Legacy per-workspace login → central login (keeps a relative `next`).
    const next = req.nextUrl.searchParams.get("next")
    return centralLogin(next?.startsWith("/") && !next.startsWith("//") ? at(next).toString() : null)
  }

  const isPublic = surface.kind === "tenant" && TENANT_PUBLIC.some((r) => r.test(pathname))
  if (!hasSession && !isPublic) {
    return centralLogin(pathname === "/" && !search ? null : at(pathname + search).toString())
  }

  const prefix = surface.kind === "platform" ? "/platform" : `/t/${surface.slug}`
  const target = new URL(`${prefix}${pathname === "/" ? "" : pathname}${search}`, req.url)
  const res = NextResponse.rewrite(target)
  if (surface.kind === "tenant") res.headers.set("x-tenant-slug", surface.slug)
  return res
}

export const config = {
  // Skip API routes, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
}
