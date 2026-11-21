import "server-only"
import type { StatCard } from "@/shared/contracts/common"
import { documentCreateSchema, type ComplianceDocument, type DocumentView } from "@/shared/contracts/resources"
import { now } from "@/shared/lib/clock"
import { percent } from "@/shared/lib/format"
import { newId } from "../db/ids"
import { conflict } from "../http/errors"
import { defineHandler, findOr404 } from "../http/handler"
import { listItems } from "../http/list"
import { createRouter } from "../http/router"
import { logActivity } from "../services/activity"
import { documentStats, documentView, sortDocuments } from "../services/derive"

export const documentsRouter = createRouter({
  "GET /": defineHandler({ permission: "documents:view" }, ({ data, query, searchParams }) => {
    const ownerRef = searchParams.get("ownerRef")
    const all = data.documents.map(documentView).filter((d) => !ownerRef || d.ownerRef === ownerRef)
    const archived = query.tab === "Arşiv"
    return listItems<DocumentView>(all.filter((d) => d.archived === archived), query, {
      search: (d) => [d.name, d.ownerRef, d.ownerType, d.responsibleName],
      tabs: {
        "Süresi yaklaşanlar": (d) => d.status.endsWith("kaldı") || d.status === "Süresi doldu",
        "Onay bekleyenler": (d) => d.status === "Onay bekliyor",
      },
      filters: { action: (d) => d.status !== "Geçerli" },
      sorts: { name: (d) => d.name, owner: (d) => d.ownerRef, expires: (d) => d.expiresAt ?? "9999", status: (d) => d.status },
      defaultSort: sortDocuments,
    })
  }),

  "GET /stats": defineHandler({ permission: "documents:view" }, ({ data }) => {
    const s = documentStats(data)
    const expired = s.docs.filter((d) => d.status === "Süresi doldu")
    const stats: StatCard[] = [
      { label: "Toplam belge", value: String(s.total), caption: "Araç, şoför, şirket ve sefer" },
      { label: "Geçerli belgeler", value: String(s.valid), caption: `${percent(s.valid, s.total)} uyum oranı` },
      { label: "Süresi yaklaşan", value: String(s.soon), caption: "Önümüzdeki 30 gün", tone: s.soon ? "warning" : "default" },
      { label: "Süresi dolan", value: String(s.expired), caption: expired.map((d) => `${d.ownerRef} ${d.name.split(" ").pop()}`).join(", ") || "Yok" },
    ]
    return stats
  }),

  "GET /quotas": defineHandler({ permission: "documents:view" }, ({ data }) => data.quotas),

  "POST /": defineHandler({ permission: "documents:create", body: documentCreateSchema }, ({ data, user, body }) => {
    const previous = data.documents.find((d) => !d.archived && d.name === body.name && d.ownerRef === body.ownerRef)
    // Yenileme akışı eskiyi arşive alır; versiyon zinciri korunur (plan §5.5, §10).
    if (previous) previous.archived = true
    const doc: ComplianceDocument = {
      id: newId("doc"),
      name: body.name,
      ownerType: body.ownerType,
      ownerRef: body.ownerRef,
      responsibleName: body.responsibleName,
      expiresAt: body.expiresAt,
      version: previous ? previous.version + 1 : 1,
      approved: false,
      archived: false,
      fileName: body.fileName,
      createdAt: now(),
      updatedAt: now(),
    }
    data.documents.unshift(doc)
    logActivity(data, user.name, { type: "document", id: doc.id, label: doc.name }, "create", `${doc.name} yüklendi (${doc.ownerRef}) · v${doc.version}. Onay bekliyor.`)
    return documentView(doc)
  }),

  "POST /:id/approve": defineHandler({ permission: "documents:approve" }, ({ data, user, params }) => {
    const doc = findOr404(data.documents, params.id, "Belge")
    if (doc.archived) throw conflict("Arşivdeki belge onaylanamaz.")
    doc.approved = true
    doc.updatedAt = now()
    logActivity(data, user.name, { type: "document", id: doc.id, label: doc.name }, "approve", "Belge onaylandı. Uygunluk durumu güncellendi.")
    return documentView(doc)
  }),

  /** Belgeler asla silinmez, arşivlenir (plan §10). */
  "POST /:id/archive": defineHandler({ permission: "documents:delete" }, ({ data, user, params }) => {
    const doc = findOr404(data.documents, params.id, "Belge")
    doc.archived = true
    doc.updatedAt = now()
    logActivity(data, user.name, { type: "document", id: doc.id, label: doc.name }, "archive", "Belge arşivlendi. Versiyon geçmişi korunuyor.")
    return documentView(doc)
  }),
})
