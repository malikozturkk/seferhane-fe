import "server-only"
/**
 * Derived read models — computed from stored records so that every screen
 * shows consistent numbers (plan: "sayfalar arası sayı çelişkisi olmaması").
 */
import type { LedgerEntry, LedgerEntryView, LedgerStatus, Receivable, ReceivableView } from "@/shared/contracts/commercial"
import type { Claim, ClaimView, Task, TaskView } from "@/shared/contracts/management"
import type { Trip, TripView } from "@/shared/contracts/operations"
import type { ComplianceDocument, DocumentStatus, DocumentView } from "@/shared/contracts/resources"
import { daysUntil, now, today } from "@/shared/lib/clock"
import type { TenantData } from "../db/types"

/* Trips ------------------------------------------------------------- */

export function tripView(t: Trip): TripView {
  const cost = t.costItems.reduce((s, c) => s + c.amount, 0)
  const docsDone = t.documents.filter((d) => d.uploaded).length
  return {
    ...t,
    cost,
    profit: t.revenue - cost,
    margin: t.revenue ? (t.revenue - cost) / t.revenue : 0,
    docsDone,
    docsTotal: t.documents.length,
  }
}

export const ACTIVE_TRIP_STATUSES = ["Planlandı", "Şoföre iletildi", "Yüklemede", "Yolda"]
export const DELIVERED_STATUSES = ["Teslim edildi", "Evrak bekliyor", "Tamamlandı"]

/* Documents --------------------------------------------------------- */

export const EXPIRY_WARNING_DAYS = 30

export function documentView(d: ComplianceDocument): DocumentView {
  const daysLeft = d.expiresAt ? daysUntil(d.expiresAt) : null
  let status: DocumentStatus = "Geçerli"
  if (!d.approved) status = "Onay bekliyor"
  else if (daysLeft !== null && daysLeft < 0) status = "Süresi doldu"
  else if (daysLeft !== null && daysLeft <= EXPIRY_WARNING_DAYS) status = `${daysLeft} gün kaldı`
  return { ...d, status, daysLeft }
}

const docPriority = (d: DocumentView) =>
  d.status === "Süresi doldu" ? 0 : d.status.endsWith("kaldı") ? 1 : d.status === "Onay bekliyor" ? 2 : 3

export const sortDocuments = (a: DocumentView, b: DocumentView) => docPriority(a) - docPriority(b)

export function documentStats(data: TenantData) {
  const docs = data.documents.filter((d) => !d.archived).map(documentView)
  return {
    total: docs.length,
    expired: docs.filter((d) => d.status === "Süresi doldu").length,
    soon: docs.filter((d) => d.status.endsWith("kaldı")).length,
    pending: docs.filter((d) => d.status === "Onay bekliyor").length,
    valid: docs.filter((d) => d.status === "Geçerli").length,
    docs,
  }
}

/** Plates that cannot be assigned: expired mandatory vehicle documents (plan §6 #2). */
export function blockedVehicles(data: TenantData): Map<string, string> {
  const blocked = new Map<string, string>()
  for (const d of documentStats(data).docs) {
    if (d.ownerType === "Araç" && d.status === "Süresi doldu") {
      blocked.set(d.ownerRef, `${d.ownerRef}: ${d.name.toLocaleLowerCase("tr")} ${d.expiresAt?.split("-").reverse().join(".")} tarihinde doldu. Sefer ataması yapılamaz.`)
    }
  }
  return blocked
}

/* Tasks ------------------------------------------------------------- */

export function taskView(t: Task): TaskView {
  const done = t.status === "Tamamlandı"
  const overdue = !done && t.dueDate < today()
  const dueToday = !done && t.dueDate === today()
  return {
    ...t,
    overdue,
    dueToday,
    displayStatus: overdue ? "Gecikti" : !done && t.priority === "Yüksek" && dueToday ? "Yüksek öncelik" : t.status,
  }
}

export function taskStats(data: TenantData, userName: string) {
  const open = data.tasks.map(taskView).filter((t) => t.status !== "Tamamlandı")
  const dueToday = open.filter((t) => t.dueToday)
  return {
    open: open.length,
    mine: open.filter((t) => t.assigneeName === userName).length,
    dueToday: dueToday.length,
    highPriority: dueToday.filter((t) => t.priority === "Yüksek").length,
    overdue: open.filter((t) => t.overdue).length,
  }
}

/* Ledger ------------------------------------------------------------ */

export function ledgerView(e: LedgerEntry): LedgerEntryView {
  const paid = e.payments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, e.amount - paid)
  const t = today()
  const status: LedgerStatus =
    e.settled || remaining === 0
      ? "Kapandı"
      : e.dueDate < t
        ? "Vadesi geçti"
        : e.dueDate === t
          ? "Bugün vadeli"
          : paid > 0
            ? "Kısmi ödendi"
            : "Açık"
  return { ...e, paid, remaining, status }
}

export const isLedgerDue = (e: LedgerEntryView) => e.status === "Vadesi geçti" || e.status === "Bugün vadeli"

/* Receivables ------------------------------------------------------- */

export function receivableView(r: Receivable): ReceivableView {
  const days = -daysUntil(r.dueDate)
  const status = r.collected ? "Tahsil edildi" : days > 0 ? `${days} gün gecikmiş` : "Ödeme bekliyor"
  return { ...r, status, overdueDays: Math.max(0, days) }
}

/* Claims ------------------------------------------------------------ */

export function claimView(c: Claim): ClaimView {
  if (c.status === "Tamamlandı") return { ...c, slaLabel: "Kapandı" }
  const ms = new Date(c.slaDueAt).getTime() - new Date(now()).getTime()
  const hours = Math.round(ms / 3_600_000)
  const slaLabel =
    hours < 0 ? `SLA ${Math.abs(hours)} saat aşıldı` : hours < 24 ? `${hours} saat kaldı · SLA` : `${c.slaDueAt.slice(8, 10)}.${c.slaDueAt.slice(5, 7)}.${c.slaDueAt.slice(0, 4)}`
  return { ...c, slaLabel }
}

/* Sidebar badges ---------------------------------------------------- */

export function navBadges(data: TenantData, userName: string): Record<string, number> {
  const docs = documentStats(data)
  return {
    tasks: taskStats(data, userName).open,
    documents: docs.expired + docs.soon + docs.pending,
    ledger: data.ledger.map(ledgerView).filter(isLedgerDue).length,
  }
}
