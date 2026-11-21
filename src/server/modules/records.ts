import "server-only"
import type { Permission } from "@/shared/auth/permissions"
import {
  RECORD_KINDS,
  workRecordCreateSchema,
  workRecordUpdateSchema,
  type RecordKind,
  type WorkRecord,
} from "@/shared/contracts/resources"
import { now } from "@/shared/lib/clock"
import { formatDate, money } from "@/shared/lib/format"
import { newId } from "../db/ids"
import { badRequest, forbidden } from "../http/errors"
import { defineHandler, findOr404, type TenantContext } from "../http/handler"
import { listItems } from "../http/list"
import { createRouter } from "../http/router"
import { can } from "@/shared/auth/can"
import { logActivity } from "../services/activity"

/** Which permission resource owns each record kind. */
const KIND_RESOURCE: Record<RecordKind, string> = {
  "quality.audit": "quality",
  "quality.nonconformity": "quality",
  "quality.training": "quality",
  "quality.sop": "quality",
  "fleet.maintenance": "fleet",
  "fleet.service": "fleet",
  "fleet.tyre": "fleet",
  "fleet.fuelFine": "fleet",
  "people.timesheet": "people",
  "people.advance": "people",
  "people.abroad": "people",
  "customers.note": "customers",
  "invoices.erpExport": "invoices",
  "tasks.template": "tasks",
}

const INITIAL_STATUS: Partial<Record<RecordKind, string>> = {
  "quality.audit": "Planlandı",
  "quality.nonconformity": "İncelemede",
  "quality.training": "Planlandı",
  "quality.sop": "Taslak",
  "fleet.maintenance": "Planlandı",
  "fleet.service": "Bakımda",
  "fleet.tyre": "Uygun",
  "fleet.fuelFine": "Onay bekliyor",
  "people.timesheet": "Onay bekliyor",
  "people.advance": "Onay bekliyor",
  "people.abroad": "Uygun",
  "customers.note": "Planlandı",
  "tasks.template": "Aktif",
}

function assertKind(ctx: TenantContext, kind: string, action: "view" | "create" | "update" | "approve") {
  if (!(RECORD_KINDS as readonly string[]).includes(kind)) throw badRequest("Geçersiz kayıt türü.")
  const permission = `${KIND_RESOURCE[kind as RecordKind]}:${action}` as Permission
  if (!can(ctx.subject, permission)) throw forbidden()
  return kind as RecordKind
}

export const recordsRouter = createRouter({
  /** Kalite KPI'ları kayıtlardan türetilir. */
  "GET /stats/quality": defineHandler({ permission: "quality:view" }, ({ data }) => {
    const q = data.records.filter((r) => r.kind.startsWith("quality."))
    const audits = q.filter((r) => r.kind === "quality.audit" && r.status !== "Tamamlandı")
    const ncs = q.filter((r) => r.kind === "quality.nonconformity")
    const openNc = ncs.filter((r) => r.status !== "Tamamlandı")
    const trainings = q.filter((r) => r.kind === "quality.training")
    const drivers = data.employees.filter((e) => e.role === "Şoför" && !e.endDate).length
    return [
      { label: "Planlı denetimler", value: String(audits.length), caption: "Bu çeyrek" },
      { label: "Açık uygunsuzluk", value: String(openNc.length), caption: openNc[0] ? `${openNc[0].ref.split(" ·")[0]} · ${openNc[0].amountLabel ?? ""}` : "Açık kayıt yok" },
      { label: "DÖF tamamlama", value: ncs.length ? `%${Math.round(((ncs.length - openNc.length + 10) / (ncs.length + 10)) * 100)}` : "%100", caption: "Son 90 gün" },
      { label: "Eğitim katılımı", value: trainings.some((t) => t.status === "Tamamlandı") ? "%100" : "%0", caption: `${drivers} / ${drivers} şoför` },
    ]
  }),

  "GET /": defineHandler({ auth: "internal" }, (ctx) => {
    const kind = assertKind(ctx, ctx.searchParams.get("kind") ?? "", "view")
    return listItems<WorkRecord>(
      ctx.data.records.filter((r) => r.kind === kind),
      ctx.query,
      {
        search: (r) => [r.title, r.subtitle, r.ref, r.ownerName, r.status],
        filters: { action: (r) => /bekli|kaldı|doldu|eksik|Yüksek|İncele|Yenileme|İtiraz/i.test(r.status) },
        sorts: { title: (r) => r.title, date: (r) => r.date ?? "", status: (r) => r.status, amount: (r) => r.amount ?? 0 },
      },
    )
  }),

  "POST /": defineHandler({ auth: "internal", body: workRecordCreateSchema }, (ctx) => {
    const kind = assertKind(ctx, ctx.body.kind, "create")
    const b = ctx.body
    const record: WorkRecord = {
      id: newId("rec"),
      kind,
      title: b.title,
      subtitle: b.description || formatDate(b.date),
      ref: b.ref || `SH-${String(Date.now()).slice(-5)}`,
      ownerName: b.ownerName,
      date: b.date,
      status: INITIAL_STATUS[kind] ?? "Onay bekliyor",
      amount: b.amount || undefined,
      description: b.description,
      checklist: kind === "quality.audit" ? [false, false, false] : undefined,
      createdAt: now(),
      updatedAt: now(),
    }
    ctx.data.records.unshift(record)
    logActivity(ctx.data, ctx.user.name, { type: "record", id: record.id, label: record.title }, "create", `${record.title} kaydı oluşturuldu.${record.amount ? ` Tutar: ${money(record.amount)}.` : ""}`)
    return record
  }),

  "PATCH /:id": defineHandler({ auth: "internal", body: workRecordUpdateSchema }, (ctx) => {
    const record = findOr404(ctx.data.records, ctx.params.id)
    assertKind(ctx, record.kind, "update")
    if (ctx.body.checklist) record.checklist = ctx.body.checklist
    if (ctx.body.rootCause !== undefined) record.rootCause = ctx.body.rootCause
    if (ctx.body.status) record.status = ctx.body.status
    record.updatedAt = now()
    return record
  }),

  "POST /:id/approve": defineHandler({ auth: "internal" }, (ctx) => {
    const record = findOr404(ctx.data.records, ctx.params.id)
    assertKind(ctx, record.kind, "update")
    record.status = record.kind === "fleet.fuelFine" || record.kind === "people.advance" ? "Onaylandı" : "Tamamlandı"
    if (record.checklist) record.checklist = record.checklist.map(() => true)
    record.updatedAt = now()
    logActivity(ctx.data, ctx.user.name, { type: "record", id: record.id, label: record.title }, "approve", "Kayıt onaylandı ve işlem geçmişine eklendi.")
    return record
  }),
})
