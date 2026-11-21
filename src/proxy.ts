import { NextResponse, type NextRequest } from "next/server"
import { resolveHost, SESSION_COOKIE } from "@/shared/tenancy/host"

/**
 * Multi-tenant routing (Next.js 16 Proxy):
 *   <slug>.<root>/path → /t/<slug>/path   (tenant panel, portal, magic links)
 *   admin.<root>/path  → /platform/path   (platform & partner console)
 *   <root>/path        → /path            (marketing)
 *
 * Also performs the *optimistic* auth check (cookie present) — real
 * authorization happens in the API on every request.
 */
const TENANT_PUBLIC = [/^\/login\/?$/, /^\/link\//]
const PLATFORM_PUBLIC = [/^\/login\/?$/]

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

  const isPublic = (surface.kind === "platform" ? PLATFORM_PUBLIC : TENANT_PUBLIC).some((r) => r.test(pathname))
  if (!hasSession && !isPublic) {
    const login = at("/login")
    if (pathname !== "/") login.searchParams.set("next", pathname + search)
    return NextResponse.redirect(login)
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
