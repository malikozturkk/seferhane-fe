import "server-only"
import { z } from "zod"
import type { StatCard } from "@/shared/contracts/common"
import {
  claimCreateSchema,
  messageCreateSchema,
  reportRangeSchema,
  ruleCreateSchema,
  taskCreateSchema,
  taskUpdateSchema,
  type AutomationRule,
  type Claim,
  type ClaimView,
  type Message,
  type ReportResult,
  type ReportTemplate,
  type Task,
  type TaskView,
} from "@/shared/contracts/management"
import { addDays, now } from "@/shared/lib/clock"
import { money, percent } from "@/shared/lib/format"
import { newId, nextNumber } from "../db/ids"
import { badRequest, conflict } from "../http/errors"
import { defineHandler, findOr404 } from "../http/handler"
import { listItems } from "../http/list"
import { createRouter } from "../http/router"
import { diff, logActivity } from "../services/activity"
import { claimView, taskStats, taskView, tripView } from "../services/derive"
import { runRules } from "../services/ruleEngine"

/* ------------------------------------------------------------------ */
/* Tasks                                                                */
/* ------------------------------------------------------------------ */

export const tasksRouter = createRouter({
  "GET /": defineHandler({ permission: "tasks:view" }, ({ data, user, query }) =>
    listItems<TaskView>(data.tasks.map(taskView), query, {
      search: (t) => [t.title, t.description, t.relatedRef, t.assigneeName],
      tabs: {
        "Tüm görevler": (t) => t.status !== "Tamamlandı",
        "Bana atananlar": (t) => t.assigneeName === user.name && t.status !== "Tamamlandı",
        "Onay bekleyenler": (t) => t.status === "Onay bekliyor",
        Tamamlananlar: (t) => t.status === "Tamamlandı",
      },
      filters: { action: (t) => t.overdue || t.priority === "Yüksek" || t.status === "Onay bekliyor" },
      sorts: { title: (t) => t.title, dueDate: (t) => `${t.dueDate} ${t.dueTime ?? ""}`, assignee: (t) => t.assigneeName, priority: (t) => t.priority },
      defaultSort: (a, b) => Number(b.overdue) - Number(a.overdue) || a.dueDate.localeCompare(b.dueDate),
    }),
  ),

  "GET /stats": defineHandler({ permission: "tasks:view" }, ({ data, user }) => {
    const s = taskStats(data, user.name)
    const all = data.tasks
    const done = all.filter((t) => t.status === "Tamamlandı").length
    const stats: StatCard[] = [
      { label: "Açık görevler", value: String(s.open), caption: `${s.mine} bana atanan` },
      { label: "Bugün bitecek", value: String(s.dueToday), caption: `${s.highPriority} yüksek öncelikli` },
      { label: "Geciken", value: String(s.overdue), caption: "Aksiyon gerekiyor", tone: s.overdue ? "warning" : "default" },
      { label: "Tamamlama oranı", value: all.length ? percent(done + 15, all.length + 16, 0) : "%0", caption: "Son 30 gün" },
    ]
    return stats
  }),

  "POST /": defineHandler({ permission: "tasks:create", body: taskCreateSchema }, ({ data, user, body }) => {
    const task: Task = {
      id: newId("tsk"),
      title: body.title,
      description: body.description,
      relatedRef: body.relatedRef || "Şirket geneli",
      assigneeName: body.assigneeName,
      dueDate: body.dueDate,
      priority: body.priority,
      status: "Bekliyor",
      checklist: body.checklist.map((label) => ({ label, done: false })),
      createdAt: now(),
      updatedAt: now(),
    }
    data.tasks.unshift(task)
    logActivity(data, user.name, { type: "task", id: task.id, label: task.title }, "create", `Görev oluşturuldu, ${task.assigneeName} sorumlu.`)
    return taskView(task)
  }),

  "PATCH /:id": defineHandler({ permission: "tasks:update", body: taskUpdateSchema }, ({ data, user, params, body }) => {
    const task = findOr404(data.tasks, params.id, "Görev")
    if (body.status === "Tamamlandı" && task.status === "Onay bekliyor" && !user.roleId.match(/owner|manager/)) {
      // Onay adımı: only managers close tasks that wait for approval.
      throw conflict("Onay bekleyen görevi yalnızca yönetici tamamlayabilir.")
    }
    const changes = diff(task, body as Partial<Task>)
    Object.assign(task, Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)), { updatedAt: now() })
    if (changes?.length) logActivity(data, user.name, { type: "task", id: task.id, label: task.title }, "update", "Görev güncellendi.", changes)
    return taskView(task)
  }),
})

/* ------------------------------------------------------------------ */
/* Claims                                                               */
/* ------------------------------------------------------------------ */

export const claimsRouter = createRouter({
  "GET /": defineHandler({ permission: "claims:view" }, ({ data, query }) =>
    listItems<ClaimView>(data.claims.map(claimView), query, {
      search: (c) => [c.number, c.title, c.kind, c.relatedRef, c.customerName, c.ownerName],
      tabs: {
        "Açık dosyalar": (c) => c.status !== "Tamamlandı",
        İncelemede: (c) => c.status === "İncelemede",
        "Kapanan dosyalar": (c) => c.status === "Tamamlandı",
      },
      filters: { action: (c) => c.status === "Yanıt bekliyor" },
      sorts: { amount: (c) => c.amount, sla: (c) => c.slaDueAt, title: (c) => c.title },
      defaultSort: (a, b) => a.slaDueAt.localeCompare(b.slaDueAt),
    }),
  ),

  "GET /stats": defineHandler({ permission: "claims:view" }, ({ data }) => {
    const open = data.claims.filter((c) => c.status !== "Tamamlandı")
    const by = (k: string) => open.filter((c) => c.kind === k).length
    const stats: StatCard[] = [
      { label: "Açık dosyalar", value: String(open.length), caption: `${by("Yük hasarı")} yük · ${by("Araç hasarı")} araç · ${by("Müşteri şikâyeti") + by("Gecikme")} şikâyet` },
      { label: "Açık hasar tutarı", value: money(open.reduce((s, c) => s + c.amount, 0)), caption: "Tahmini toplam" },
      { label: "Ortalama kapanış", value: "12 gün", caption: "Hedef: 14 gün" },
      { label: "SLA uyumu", value: "%96", caption: "Son 90 gün" },
    ]
    return stats
  }),

  "GET /analysis": defineHandler({ permission: "claims:view" }, ({ data }) => {
    const groups = [
      { label: "Yük hasarı", kinds: ["Yük hasarı"] },
      { label: "Araç hasarı", kinds: ["Araç hasarı"] },
      { label: "Hizmet şikâyeti", kinds: ["Müşteri şikâyeti", "Gecikme"] },
    ]
    const total = data.claims.reduce((s, c) => s + c.amount, 0) || 1
    return groups.map((g) => ({
      label: g.label,
      value: Math.round((data.claims.filter((c) => g.kinds.includes(c.kind)).reduce((s, c) => s + c.amount, 0) / total) * 100),
    }))
  }),

  "POST /": defineHandler({ permission: "claims:create", body: claimCreateSchema }, ({ data, user, body }) => {
    const claim: Claim = {
      id: newId("clm"),
      number: nextNumber(data.sequences, "claim", "HSR-2026", 3),
      ...body,
      relatedRef: body.relatedRef || "Şirket geneli",
      slaDueAt: new Date(new Date(now()).getTime() + 24 * 3_600_000).toISOString(),
      status: "Yanıt bekliyor",
      source: "Panel",
      createdAt: now(),
      updatedAt: now(),
    }
    data.claims.unshift(claim)
    logActivity(data, user.name, { type: "claim", id: claim.id, label: claim.number }, "create", `${claim.kind} dosyası açıldı · ${money(claim.amount)}. İlk yanıt SLA: 24 saat.`)
    return claimView(claim)
  }),

  "PATCH /:id": defineHandler(
    { permission: "claims:update", body: z.object({ status: z.enum(["Yanıt bekliyor", "İncelemede", "Tamamlandı"]) }) },
    ({ data, user, params, body }) => {
      const claim = findOr404(data.claims, params.id, "Dosya")
      const before = claim.status
      claim.status = body.status
      claim.updatedAt = now()
      logActivity(data, user.name, { type: "claim", id: claim.id, label: claim.number }, "status", `Dosya durumu: ${body.status}.`, [
        { field: "status", from: before, to: body.status },
      ])
      return claimView(claim)
    },
  ),
})

/* ------------------------------------------------------------------ */
/* Messages                                                             */
/* ------------------------------------------------------------------ */

export const messagesRouter = createRouter({
  "GET /channels": defineHandler({ permission: "messages:view" }, ({ data }) =>
    data.channels.map((c) => ({ ...c, unread: c.id === "chn_ops" ? data.messages.filter((m) => m.channelId === c.id).length : 0 })),
  ),
  "GET /channels/:id": defineHandler({ permission: "messages:view" }, ({ data, params }) => {
    const channel = findOr404(data.channels, params.id, "Kanal")
    return { channel, messages: data.messages.filter((m) => m.channelId === channel.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }
  }),
  "POST /channels/:id": defineHandler({ permission: "messages:create", body: messageCreateSchema }, ({ data, user, params, body }) => {
    const channel = findOr404(data.channels, params.id, "Kanal")
    const message: Message = {
      id: newId("msg"),
      channelId: channel.id,
      authorName: user.name,
      text: body.text,
      whatsapp: channel.kind === "announcements" ? "pending" : undefined,
      createdAt: now(),
      updatedAt: now(),
    }
    data.messages.push(message)
    return message
  }),
})

/* ------------------------------------------------------------------ */
/* Reports                                                              */
/* ------------------------------------------------------------------ */

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: "ops", title: "Operasyon performansı", description: "Sefer sayısı, zamanında teslim ve doluluk.", phase: "MVP", icon: "target" },
  { id: "docs", title: "Belge & uyum raporu", description: "Eksik, yaklaşan ve süresi dolan belgeler.", phase: "MVP", icon: "shield" },
  { id: "profit", title: "Sefer kâr özeti", description: "Gelir, gider ve brüt kâr karşılaştırması.", phase: "MVP", icon: "trend" },
  { id: "team", title: "Görev & ekip performansı", description: "Tamamlanma oranı ve geciken görevler.", phase: "MVP", icon: "users" },
  { id: "service", title: "Müşteri hizmet raporu", description: "Müşteriye özel aylık hizmet seviyesi.", phase: "Faz 2", icon: "file" },
  { id: "advanced", title: "Gelişmiş kârlılık analizi", description: "Müşteri, hat, araç ve şoför kırılımı.", phase: "Faz 3", icon: "sparkles" },
]

export const reportsRouter = createRouter({
  "GET /": defineHandler({ permission: "reports:view" }, ({ data }) => ({
    templates: REPORT_TEMPLATES,
    saved: data.savedReports,
    scheduled: data.scheduledReports,
  })),

  "POST /run/:templateId": defineHandler({ permission: "reports:view", body: reportRangeSchema }, ({ data, params, body }) => {
    if (!REPORT_TEMPLATES.some((t) => t.id === params.templateId)) throw badRequest("Rapor şablonu bulunamadı.")
    if (body.from > body.to) throw badRequest("Başlangıç tarihi bitişten sonra olamaz.", { from: "Bitişten önce olmalı" })
    const trips = data.trips.map(tripView).filter((t) => t.date >= body.from && t.date <= body.to)
    const docs = trips.reduce((s, t) => s + t.docsDone, 0)
    const total = trips.reduce((s, t) => s + t.docsTotal, 0)
    const result: ReportResult = {
      templateId: params.templateId,
      from: body.from,
      to: body.to,
      tripCount: trips.length || 28,
      onTimeRate: "%96,4",
      documentCompleteness: total ? percent(docs, total) : "%100",
      rows: trips.map((t) => ({ trip: t.number, customer: t.customerName, revenue: t.revenue, cost: t.cost })),
    }
    return result
  }),

  "POST /saved": defineHandler(
    { permission: "reports:create", body: reportRangeSchema.extend({ templateId: z.string() }) },
    ({ data, user, body }) => {
      const template = REPORT_TEMPLATES.find((t) => t.id === body.templateId)
      if (!template) throw badRequest("Rapor şablonu bulunamadı.")
      const saved = { id: newId("rpt"), templateId: template.id, title: template.title, from: body.from, to: body.to, createdAt: now(), updatedAt: now() }
      data.savedReports.unshift(saved)
      logActivity(data, user.name, { type: "report", id: saved.id, label: saved.title }, "create", "Rapor kayıtlı raporlara eklendi.")
      return saved
    },
  ),

  "POST /schedule/:templateId": defineHandler({ permission: "reports:create" }, ({ data, params }) => {
    const on = !data.scheduledReports.includes(params.templateId)
    data.scheduledReports = on ? [...data.scheduledReports, params.templateId] : data.scheduledReports.filter((t) => t !== params.templateId)
    return { scheduled: on }
  }),
})

/* ------------------------------------------------------------------ */
/* Automation                                                           */
/* ------------------------------------------------------------------ */

const CONDITION_TEXT: Record<AutomationRule["condition"], (n: number) => string> = {
  "Bitişine kalan gün": (n) => `Bitişine ≤ ${n} gün kaldığında`,
  "Durum değişikliği": () => "Durum değiştiğinde",
  "Gecikme saati": (n) => `≥ ${n} saat geciktiğinde`,
  "Kalan kilometre": (n) => `≤ ${n.toLocaleString("tr-TR")} km kaldığında`,
}

export const automationRouter = createRouter({
  "GET /rules": defineHandler({ permission: "automation:view" }, ({ data }) => data.rules),
  "GET /runs": defineHandler({ permission: "automation:view" }, ({ data }) => data.ruleRuns.slice(0, 50)),

  "POST /rules": defineHandler({ permission: "automation:create", body: ruleCreateSchema }, ({ data, user, body }) => {
    const rule: AutomationRule = {
      id: newId("rul"),
      ...body,
      conditionText: CONDITION_TEXT[body.condition](body.threshold),
      enabled: true,
      library: false,
      createdAt: now(),
      updatedAt: now(),
    }
    data.rules.unshift(rule)
    logActivity(data, user.name, { type: "rule", id: rule.id, label: rule.name }, "create", `Otomasyon kuralı oluşturuldu: ${rule.object} · ${rule.conditionText} → ${rule.action}.`)
    return rule
  }),

  "PATCH /rules/:id": defineHandler(
    { permission: "automation:update", body: z.object({ enabled: z.boolean() }) },
    ({ data, user, params, body }) => {
      const rule = findOr404(data.rules, params.id, "Kural")
      rule.enabled = body.enabled
      rule.updatedAt = now()
      logActivity(data, user.name, { type: "rule", id: rule.id, label: rule.name }, "update", body.enabled ? "Kural etkinleştirildi." : "Kural duraklatıldı.")
      return rule
    },
  ),

  /** Run now (the nightly job on demand). */
  "POST /run": defineHandler({ permission: "automation:update" }, ({ data }) => {
    const runs = runRules(data)
    return { runs, created: runs.reduce((s, r) => s + r.created, 0), nextRun: `${addDays(now(), 1).slice(0, 10)} 08:00` }
  }),
})
