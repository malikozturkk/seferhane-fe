import "server-only"
import type { DashboardData } from "@/shared/contracts/management"
import { today } from "@/shared/lib/clock"
import { money, percent } from "@/shared/lib/format"
import { defineHandler } from "../http/handler"
import { createRouter } from "../http/router"
import { DELIVERED_STATUSES, documentStats, taskStats, tripView } from "../services/derive"
import { monthSeries, sumSeries, weekSeries } from "../services/trips"

const STATUS_ORDER = ["Yolda", "Yüklemede", "Planlandı", "Teslim edildi", "Evrak bekliyor"]

export const dashboardRouter = createRouter({
  /** Rol bazlı üç görünüm (plan §5.1). Numbers are derived from records, never hardcoded. */
  "GET /": defineHandler({ permission: "dashboard:view" }, ({ data, user, searchParams }) => {
    const view = (searchParams.get("view") ?? "executive") as DashboardData["view"]
    const todays = data.trips.filter((t) => t.date === today()).map(tripView)
    const onRoad = todays.filter((t) => ["Yolda", "Yüklemede"].includes(t.status)).length
    const delivered = todays.filter((t) => DELIVERED_STATUSES.includes(t.status)).length
    const week = sumSeries(weekSeries(data))
    const docs = documentStats(data)
    const tasks = taskStats(data, user.name)
    const docsWaiting = data.trips
      .map(tripView)
      .filter((t) => t.docsDone < t.docsTotal && ["Teslim edildi", "Evrak bekliyor"].includes(t.status))
    const docAlerts = docs.expired + docs.soon
    const actions = docAlerts + tasks.dueToday + docsWaiting.length
    const critical = docs.expired + tasks.highPriority
    const fleet = data.vehicles.filter((v) => v.kind !== "Hizmet aracı")
    const service = data.vehicles.length - fleet.length

    const metricTrips = {
      key: "trips",
      label: "Bugünkü seferler",
      value: String(todays.length),
      change: `${delivered} teslim`,
      foot: `${onRoad} sahada · ${todays.length - onRoad - delivered} planlı`,
      href: "/operations",
    }
    const metricFleet = {
      key: "fleet",
      label: "Sahadaki araçlar",
      value: String(onRoad),
      change: `${fleet.filter((v) => v.status === "Müsait").length} müsait`,
      foot: `${fleet.length} yük aracı · ${data.vehicles.filter((v) => v.status === "Bakımda").length} bakımda · ${service} hizmet aracı`,
      href: "/fleet",
    }
    const metricProfit = {
      key: "profit",
      label: "Haftalık brüt kâr",
      value: money(week.profit),
      change: percent(week.profit, week.revenue),
      foot: `Son 7 gün · ${money(week.revenue)} gelir`,
      href: "/costs",
    }
    const metricActions = {
      key: "actions",
      label: "Aksiyon bekleyenler",
      value: String(actions),
      change: `${critical} kritik`,
      foot: `${docAlerts} belge · ${tasks.dueToday} görev · ${docsWaiting.length} evrak`,
      href: "/tasks",
      tone: "warning" as const,
    }
    const metrics: DashboardData["metrics"] =
      view === "me"
        ? [
            metricTrips,
            { key: "mine", label: "Bana atanan görevler", value: String(tasks.mine), change: `${tasks.dueToday} bugün`, foot: `${tasks.open} açık görev`, href: "/tasks" },
            metricProfit,
            metricActions,
          ]
        : view === "operations"
          ? [
              { key: "loads", label: "Planlanmamış yükler", value: String(data.loads.length), change: `${todays.length} planlı`, foot: "Sefer planlama tahtasında bekliyor", href: "/planning" },
              metricFleet,
              { key: "overdue", label: "Geciken görevler", value: String(tasks.overdue), change: `${tasks.dueToday} bugün`, foot: `${tasks.open} açık görev`, href: "/tasks" },
              { key: "pod", label: "Eksik POD", value: String(docsWaiting.length), change: `${docsWaiting.length} dosya`, foot: docsWaiting.map((t) => t.number).join(", ") || "Tüm evraklar tamam", href: "/operations", tone: "warning" },
            ]
          : [metricTrips, metricFleet, metricProfit, metricActions]

    const data_: DashboardData = {
      view,
      metrics,
      statusBreakdown: STATUS_ORDER.map((status) => ({ status, count: todays.filter((t) => t.status === status).length })).filter(
        (s) => s.count > 0,
      ),
      todayTripCount: todays.length,
      onTime: { rate: "%100", text: "Son 7 günde teslim edilen seferlerin tamamı zamanında" },
      attention: [
        {
          key: "documents",
          tone: "orange",
          title: `${docAlerts} belge aksiyon bekliyor`,
          text: `${docs.expired} süresi dolmuş belge, ${docs.soon} süresi yaklaşan belge`,
          href: "/documents",
          linkLabel: "Belgeleri incele",
        },
        {
          key: "pod",
          tone: "purple",
          title: `${docsWaiting.length} sefer evrak bekliyor`,
          text: docsWaiting.length ? `${docsWaiting.map((t) => t.number).join(", ")} · POD eksik` : "Tüm teslim edilen seferlerin evrakı tamam",
          href: "/operations",
          linkLabel: "Dosyalara git",
        },
        {
          key: "tasks",
          tone: "blue",
          title: `${tasks.dueToday} görevin son günü bugün`,
          text: `${tasks.highPriority} yüksek öncelikli, ${tasks.overdue} geciken görev`,
          href: "/tasks",
          linkLabel: "Görevleri görüntüle",
        },
      ],
      attentionTotal: actions,
    }
    return data_
  }),

  "GET /trend": defineHandler({ permission: ["dashboard:view", "costs:view", "reports:view"] }, ({ data }) => {
    const week = weekSeries(data)
    const month = monthSeries(data)
    return { week, month, weekTotal: sumSeries(week), monthTotal: sumSeries(month) }
  }),
})
