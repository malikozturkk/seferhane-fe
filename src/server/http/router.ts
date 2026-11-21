import "server-only"
import { NextResponse, type NextRequest } from "next/server"

type Handler = (req: NextRequest, route: { params: Promise<Record<string, string | string[]>> }) => Promise<Response>
type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

/**
 * Tiny path router so each backend module exposes one catch-all route
 * (`app/api/v1/<module>/[[...path]]/route.ts`). Keys look like
 * `"GET /"`, `"POST /:id/close"`. With a real backend this file disappears.
 */
export function createRouter(routes: Record<string, Handler>) {
  const compiled = Object.entries(routes).map(([key, handler]) => {
    const [method, path] = key.split(" ") as [Method, string]
    return { method, segments: path.split("/").filter(Boolean), handler }
  })

  const dispatch =
    (method: Method) =>
    async (req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) => {
      const { path = [] } = await ctx.params
      let methodMismatch = false
      for (const route of compiled) {
        if (route.segments.length !== path.length) continue
        const params: Record<string, string> = {}
        const ok = route.segments.every((seg, i) => {
          if (seg.startsWith(":")) {
            params[seg.slice(1)] = path[i]
            return true
          }
          return seg === path[i]
        })
        if (!ok) continue
        if (route.method !== method) {
          methodMismatch = true
          continue
        }
        return route.handler(req, { params: Promise.resolve(params) })
      }
      return NextResponse.json(
        { type: "about:blank", title: methodMismatch ? "Yöntem desteklenmiyor" : "Bulunamadı", status: methodMismatch ? 405 : 404 },
        { status: methodMismatch ? 405 : 404 },
      )
    }

  return { GET: dispatch("GET"), POST: dispatch("POST"), PATCH: dispatch("PATCH"), PUT: dispatch("PUT"), DELETE: dispatch("DELETE") }
}
