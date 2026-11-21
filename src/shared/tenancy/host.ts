/**
 * Host → surface resolution, shared by `proxy.ts` and the API.
 *
 *   seferhane.com            → apex (marketing)
 *   admin.seferhane.com      → platform & partner console
 *   <slug>.seferhane.com     → tenant panel / portal
 *
 * In development the root domain is `localhost:3000`, so tenants are reached
 * at `http://alpcengiz.localhost:3000` (browsers resolve *.localhost locally).
 */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase()
export const PLATFORM_SUBDOMAIN = "admin"
const RESERVED = new Set(["www", "api", "app", "static", "cdn", PLATFORM_SUBDOMAIN])

export type HostSurface = { kind: "apex" } | { kind: "platform" } | { kind: "tenant"; slug: string }

export function resolveHost(host: string | null | undefined): HostSurface {
  const h = (host ?? "").toLowerCase()
  const root = ROOT_DOMAIN.split(":")[0]
  const hostname = h.split(":")[0]
  if (!hostname || hostname === root || hostname === "127.0.0.1" || hostname === `www.${root}`) return { kind: "apex" }
  if (!hostname.endsWith(`.${root}`)) return { kind: "apex" }
  const sub = hostname.slice(0, -(root.length + 1))
  if (sub === PLATFORM_SUBDOMAIN) return { kind: "platform" }
  if (!sub || sub.includes(".") || RESERVED.has(sub)) return { kind: "apex" }
  return { kind: "tenant", slug: sub }
}

/** Absolute URL of a tenant (used by the platform console & magic links). */
export function tenantUrl(slug: string, path = "/") {
  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https"
  return `${protocol}://${slug}.${ROOT_DOMAIN}${path}`
}

export function platformUrl(path = "/") {
  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https"
  return `${protocol}://${PLATFORM_SUBDOMAIN}.${ROOT_DOMAIN}${path}`
}

export const SESSION_COOKIE = "sh_session"
