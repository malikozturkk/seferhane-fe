import { canDo } from "@/shared/auth/can"
import { matches } from "@/shared/lib/format"
import type { SearchResult } from "@/shared/contracts/management"
import { defineHandler } from "@/server/http/handler"


/** Global ⌘K search across records the user may see. */
export const GET = defineHandler({ auth: "internal" }, ({ data, subject, searchParams }) => {
  const q = searchParams.get("q")?.trim() ?? ""
  const results: SearchResult[] = []
  const allow = (r: Parameters<typeof canDo>[1]) => canDo(subject, r, "view")

  if (allow("trips")) {
    const trips = data.trips
      .filter((t) => !q || matches([t.number, t.customerName, t.plate, t.driverName, t.from, t.to], q))
      .slice(0, 5)
    results.push(
      ...trips.map((t) => ({
        type: "trip" as const,
        id: t.id,
        title: t.number,
        subtitle: `${t.customerName} · ${t.from} → ${t.to}`,
        href: `/operations/${t.id}`,
      })),
    )
  }
  if (!q) return results
  if (allow("customers"))
    results.push(
      ...data.customers
        .filter((c) => matches([c.name, c.code, c.contactName], q))
        .slice(0, 4)
        .map((c) => ({ type: "customer" as const, id: c.id, title: c.name, subtitle: `${c.code} · ${c.contactName}`, href: `/customers` })),
    )
  if (allow("fleet"))
    results.push(
      ...data.vehicles
        .filter((v) => matches([v.plate, v.model, v.driverName], q))
        .slice(0, 4)
        .map((v) => ({ type: "vehicle" as const, id: v.id, title: v.plate, subtitle: `${v.model} · ${v.driverName ?? "Şoför atanmamış"}`, href: `/fleet` })),
    )
  if (allow("people"))
    results.push(
      ...data.employees
        .filter((e) => matches([e.name, e.phone, e.plate], q))
        .slice(0, 4)
        .map((e) => ({ type: "employee" as const, id: e.id, title: e.name, subtitle: `${e.role} · ${e.phone}`, href: `/people` })),
    )
  if (allow("documents"))
    results.push(
      ...data.documents
        .filter((d) => !d.archived && matches([d.name, d.ownerRef], q))
        .slice(0, 4)
        .map((d) => ({ type: "document" as const, id: d.id, title: d.name, subtitle: d.ownerRef, href: `/documents` })),
    )
  return results
})
