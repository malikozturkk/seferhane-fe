import "server-only"
import type { StatCard } from "@/shared/contracts/common"
import { employeeCreateSchema, employeeExitSchema, type Employee } from "@/shared/contracts/resources"
import { now, today } from "@/shared/lib/clock"
import { formatDate } from "@/shared/lib/format"
import { newId } from "../db/ids"
import { badRequest, conflict } from "../http/errors"
import { defineHandler, findOr404 } from "../http/handler"
import { listItems } from "../http/list"
import { createRouter } from "../http/router"
import { logActivity } from "../services/activity"

export const employeesRouter = createRouter({
  "GET /": defineHandler({ permission: ["people:view", "fleet:view", "planning:view"] }, ({ data, query, searchParams }) => {
    const role = searchParams.get("role")
    const active = searchParams.get("active") === "1"
    const rows = data.employees.filter((e) => (!role || e.role === role) && (!active || !e.endDate))
    return listItems<Employee>(rows, query, {
      search: (e) => [e.name, e.role, e.phone, e.plate, e.email],
      tabs: {
        Çalışanlar: () => true,
        Performans: (e) => e.role === "Şoför" && !e.endDate,
      },
      filters: { action: (e) => e.status === "İzinli" || Boolean(e.srcExpiry && e.srcExpiry < "2026-12-03") },
      sorts: { name: (e) => e.name, score: (e) => e.score ?? 0, startDate: (e) => e.startDate },
      defaultSort: (a, b) => Number(Boolean(a.endDate)) - Number(Boolean(b.endDate)),
    })
  }),

  "GET /stats": defineHandler({ permission: "people:view" }, ({ data }) => {
    const active = data.employees.filter((e) => !e.endDate)
    const drivers = active.filter((e) => e.role === "Şoför")
    const onTrip = new Set(data.trips.filter((t) => t.date === today()).map((t) => t.driverId))
    const onDuty = drivers.filter((d) => d.status === "Seferde").length
    const onLeave = drivers.filter((d) => d.status === "İzinli").length
    const avg = drivers.reduce((s, d) => s + (d.score ?? 0), 0) / (drivers.length || 1)
    const stats: StatCard[] = [
      { label: "Aktif çalışan", value: String(active.length), caption: `${drivers.length} şoför · ${active.length - drivers.length} ofis` },
      { label: "Bugün seferde", value: String(drivers.filter((d) => onTrip.has(d.id)).length), caption: `${onDuty} şu an yolda` },
      { label: "İzinli şoförler", value: String(onLeave), caption: onLeave ? "Bu hafta izinde" : "Bu hafta izin yok" },
      { label: "Ortalama puan", value: avg.toFixed(1).replace(".", ","), caption: "Son 30 gün" },
    ]
    return stats
  }),

  "POST /": defineHandler({ permission: "people:create", body: employeeCreateSchema }, ({ data, user, body }) => {
    const vehicle = body.vehicleId ? findOr404(data.vehicles, body.vehicleId, "Araç") : undefined
    const employee: Employee = {
      id: newId("emp"),
      name: body.name,
      role: body.role,
      phone: body.phone,
      email: body.email || undefined,
      vehicleId: vehicle?.id,
      plate: vehicle?.plate,
      startDate: body.startDate,
      src: body.role === "Şoför" && body.src !== "Belirtilmedi" ? body.src : undefined,
      status: body.role === "Şoför" ? "Müsait" : "Aktif",
      department: body.role === "Şoför" ? "Operasyon" : "Yönetim",
      createdAt: now(),
      updatedAt: now(),
    }
    if (vehicle && body.role === "Şoför") Object.assign(vehicle, { driverId: employee.id, driverName: employee.name })
    data.employees.push(employee)
    logActivity(data, user.name, { type: "employee", id: employee.id, label: employee.name }, "create", `${employee.name} çalışan kaydı oluşturuldu (${employee.role}).`)
    return employee
  }),

  /** Çıkış tarihi girilen çalışan silinmez; "Ayrıldı" olarak pasifleşir (plan §5.8). */
  "POST /:id/exit": defineHandler({ permission: "people:update", body: employeeExitSchema }, ({ data, user, params, body }) => {
    const employee = findOr404(data.employees, params.id, "Çalışan")
    if (employee.endDate) throw conflict("Bu çalışanın çıkışı zaten kaydedilmiş.")
    if (body.endDate < employee.startDate) throw badRequest("Çıkış tarihi işe giriş tarihinden önce olamaz.", { endDate: "İşe girişten önce olamaz" })
    employee.endDate = body.endDate
    employee.status = "Ayrıldı"
    employee.updatedAt = now()
    const vehicle = data.vehicles.find((v) => v.driverId === employee.id)
    if (vehicle) Object.assign(vehicle, { driverId: undefined, driverName: undefined })
    logActivity(data, user.name, { type: "employee", id: employee.id, label: employee.name }, "exit", `İşe çıkış tarihi ${formatDate(body.endDate)} olarak kaydedildi. Kayıt pasife alındı, silinmedi.`)
    return employee
  }),
})
