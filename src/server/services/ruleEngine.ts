import "server-only"
/**
 * Kural motoru (plan §6 #1, #9, #18 + tasarım notu): rules are data
 * (object + condition + threshold + action); running them creates tasks,
 * notifications and a run log. With a real backend this is the nightly job.
 */
import type { AutomationRule, RuleRun, Task } from "@/shared/contracts/management"
import { addDays, now, today } from "@/shared/lib/clock"
import { newId } from "../db/ids"
import type { TenantData } from "../db/types"
import { claimView, documentView, taskView, tripView } from "./derive"

interface Finding {
  title: string
  ref: string
  text: string
}

function evaluate(data: TenantData, rule: AutomationRule): Finding[] {
  switch (rule.object) {
    case "Belge":
      return data.documents
        .filter((d) => !d.archived && d.approved)
        .map(documentView)
        .filter((d) => d.daysLeft !== null && d.daysLeft <= rule.threshold)
        .map((d) => ({
          title: `${d.ownerRef} ${d.name.toLocaleLowerCase("tr")} yenile`,
          ref: d.ownerRef,
          text: d.daysLeft! < 0 ? `${d.name} süresi doldu` : `${d.name} · ${d.daysLeft} gün kaldı`,
        }))
    case "Sefer":
      return data.trips
        .map(tripView)
        .filter((t) => ["Teslim edildi", "Evrak bekliyor"].includes(t.status))
        .filter((t) => t.documents.some((d) => d.name.includes("POD") && !d.uploaded))
        .map((t) => ({ title: `${t.number} POD belgesini topla`, ref: t.number, text: `${t.number} teslim edildi, POD eksik` }))
    case "Araç":
      return data.records
        .filter((r) => r.kind === "fleet.maintenance" && r.status !== "Tamamlandı")
        .filter((r) => Number((r.detail ?? "").replace(/\D/g, "")) > 0 && Number((r.detail ?? "").replace(/\D/g, "")) <= rule.threshold)
        .map((r) => ({ title: `${r.ref} ${r.title.toLocaleLowerCase("tr")} planla`, ref: r.ref, text: `${r.title} · ${r.detail}` }))
    case "Hasar":
      return data.claims
        .map(claimView)
        .filter((c) => c.status === "Yanıt bekliyor" && (new Date(now()).getTime() - new Date(c.createdAt).getTime()) / 3_600_000 >= rule.threshold)
        .map((c) => ({ title: `${c.number} ilk yanıt gecikti`, ref: c.relatedRef, text: `${c.title} · ${c.slaLabel}` }))
    case "Görev":
      return data.tasks
        .map(taskView)
        .filter((t) => t.overdue)
        .map((t) => ({ title: `Geciken görev: ${t.title}`, ref: t.relatedRef, text: `${t.assigneeName} · son tarih ${t.dueDate}` }))
  }
}

export function runRules(data: TenantData, ruleIds?: string[]): RuleRun[] {
  const runs: RuleRun[] = []
  for (const rule of data.rules.filter((r) => r.enabled && (!ruleIds || ruleIds.includes(r.id)))) {
    const findings = evaluate(data, rule)
    let created = 0
    for (const f of findings) {
      if (rule.action === "Görev oluştur & sorumluya bildir") {
        const exists = data.tasks.some((t) => t.title === f.title && t.status !== "Tamamlandı")
        if (exists) continue
        const task: Task = {
          id: newId("tsk"),
          title: f.title,
          description: f.text,
          source: `Otomatik görev · ${rule.name}`,
          relatedRef: f.ref,
          assigneeName: data.users.find((u) => u.roleId.endsWith("_role_manager"))?.name ?? data.users[0]?.name ?? "—",
          dueDate: addDays(today(), 1),
          priority: "Yüksek",
          status: "Bekliyor",
          checklist: [],
          createdAt: now(),
          updatedAt: now(),
        }
        data.tasks.unshift(task)
        created++
      }
      if (rule.action !== "Görev oluştur & sorumluya bildir" || created) {
        data.notifications.unshift({
          id: newId("ntf"),
          title: rule.action === "Yöneticiye eskalasyon" ? `Eskalasyon · ${f.title}` : f.title,
          text: f.text,
          href: rule.object === "Belge" ? "/documents" : rule.object === "Sefer" ? "/operations" : rule.object === "Hasar" ? "/claims" : "/tasks",
          tone: rule.action === "Yöneticiye eskalasyon" ? "orange" : "blue",
          icon: rule.object === "Belge" ? "shield" : rule.object === "Araç" ? "truck" : "task",
          createdAt: now(),
          readBy: [],
        })
      }
    }
    rule.lastRunAt = now()
    const run: RuleRun = {
      id: newId("run"),
      ruleId: rule.id,
      ruleName: rule.name,
      ranAt: now(),
      result: findings.length
        ? `${findings.length} kayıt eşiği aştı · ${created} yeni görev oluşturuldu.`
        : "Kontrol tamamlandı. Eşiği aşan kayıt bulunmadı.",
      status: "Başarılı",
      created,
    }
    data.ruleRuns.unshift(run)
    runs.push(run)
  }
  return runs
}
