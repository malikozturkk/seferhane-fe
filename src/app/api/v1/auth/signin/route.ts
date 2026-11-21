import { NextResponse, type NextRequest } from "next/server"
import { apexHostOf, SIGNIN_NEXT_HEADER } from "@/shared/tenancy/host"

/**
 * Sends a workspace visitor to the central login (seferhane.com/login).
 *
 * `proxy.ts` rewrites here instead of redirecting itself: Next.js turns proxy
 * redirects into *relative* Location headers when the target host equals its
 * internal request host (the apex in dev), which would loop on the subdomain.
 * The target is always the apex login, so `next` can't be used as an open redirect.
 */
export function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")
  const url = new URL(`${proto}://${apexHostOf(host)}/login`)
  const next = req.headers.get(SIGNIN_NEXT_HEADER)
  if (next) url.searchParams.set("next", next)
  return NextResponse.redirect(url)
}
