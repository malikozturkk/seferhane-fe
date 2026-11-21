import "server-only"
import type { StatCard } from "@/shared/contracts/common"
import {
  customerCreateSchema,
  invoiceCreateSchema,
  ledgerAmountSchema,
  ledgerCreateSchema,
  ledgerPaymentSchema,
  quoteCreateSchema,
  tariffCreateSchema,
  type CostOverview,
  type Customer,
  type InvoiceDraft,
  type LedgerEntry,
  type LedgerEntryView,
  type LedgerSummary,
  type ProfitRow,
  type Quote,
  type ReceivableView,
  type Tariff,
} from "@/shared/contracts/commercial"
import { now, today } from "@/shared/lib/clock"
import { formatDate, money, percent } from "@/shared/lib/format"
import { newId, nextNumber } from "../db/ids"
import type { TenantData } from "../db/types"
import { badRequest, conflict } from "../http/errors"
import { defineHandler, findOr404 } from "../http/handler"
import { listItems } from "../http/list"
import { createRouter } from "../http/router"
import { logActivity } from "../services/activity"
import { isLedgerDue, ledgerView, receivableView, tripView } from "../services/derive"
import { monthSeries, weekSeries } from "../services/trips"

/* ------------------------------------------------------------------ */
/* Customers                                                            */
/* ------------------------------------------------------------------ */

export const customersRouter = createRouter({
  "GET /": defineHandler({ permission: ["customers:view", "trips:create", "quotes:view"] }, ({ data, query }) =>
    listItems<Customer>(data.customers, query, {
      search: (c) => [c.name, c.code, c.sector, c.contactName],
      sorts: { name: (c) => c.name, revenue: (c) => c.revenueLastMonth, trips: (c) => c.tripsLastMonth },
      defaultSort: (a, b) => b.revenueLastMonth - a.revenueLastMonth,
    }),
  ),

  "GET /stats": defineHandler({ permission: "customers:view" }, ({ data }) => {
    const open = data.quotes.filter((q) => ["Taslak", "Onay bekliyor"].includes(q.status))
    const decided = data.quotes.filter((q) => q.status !== "Taslak" && q.status !== "Onay bekliyor")
    const accepted = decided.filter((q) => q.status !== "Reddedildi")
    const revenue = data.customers.reduce((s, c) => s + c.revenueLastMonth, 0)
    const trips = data.customers.reduce((s, c) => s + c.tripsLastMonth, 0)
    const newest = [...data.customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    const stats: StatCard[] = [
      { label: "Aktif müşteri", value: String(data.customers.filter((c) => c.status === "Aktif").length), caption: newest ? `En yeni · ${newest.name}` : "—" },
      { label: "Açık teklif", value: String(open.length), caption: money(open.reduce((s, q) => s + q.price, 0)) },
      { label: "Kabul oranı", value: decided.length ? percent(accepted.length, decided.length, 0) : "%68", caption: "Son 90 gün" },
      { label: "Aylık ciro", value: money(revenue), caption: `Ekim 2026 · ${trips} sefer` },
    ]
    return stats
  }),

  "POST /": defineHandler({ permission: "customers:create", body: customerCreateSchema }, ({ data, user, body }) => {
    if (data.customers.some((c) => c.name.toLocaleLowerCase("tr") === body.name.toLocaleLowerCase("tr")))
      throw badRequest("Bu müşteri zaten kayıtlı.", { name: "Bu müşteri zaten kayıtlı" })
    const customer: Customer = {
      id: newId("cus"),
      code: `MŞT-${String(data.customers.length + 30).padStart(4, "0")}`,
      name: body.name,
      sector: body.sector || "—",
      taxNumber: body.taxNumber,
      contactName: body.contactName,
      contactEmail: body.contactEmail || undefined,
      contactPhone: body.contactPhone,
      paymentTermDays: body.paymentTermDays,
      status: "Aktif",
      tripsLastMonth: 0,
      revenueLastMonth: 0,
      createdAt: now(),
      updatedAt: now(),
    }
    data.customers.push(customer)
    logActivity(data, user.name, { type: "customer", id: customer.id, label: customer.name }, "create", `${customer.name} müşteri kartı oluşturuldu.`)
    return customer
  }),
})

/* ------------------------------------------------------------------ */
/* Quotes & tariffs                                                     */
/* ------------------------------------------------------------------ */

export const quotesRouter = createRouter({
  "GET /": defineHandler({ permission: "quotes:view" }, ({ data, query }) =>
    listItems<Quote>(data.quotes, query, {
      search: (q) => [q.number, q.customerName, q.from, q.to, q.details],
      filters: { action: (q) => q.status === "Onay bekliyor" || q.status === "Taslak" },
      sorts: { number: (q) => q.number, price: (q) => q.price, validUntil: (q) => q.validUntil },
      defaultSort: (a, b) => b.number.localeCompare(a.number),
    }),
  ),

  "POST /": defineHandler({ permission: "quotes:create", body: quoteCreateSchema }, ({ data, user, body }) => {
    const quote: Quote = {
      id: newId("qte"),
      number: nextNumber(data.sequences, "quote", "TKL-2026", 3),
      customerId: body.customerId || data.customers.find((c) => c.name === body.customerName)?.id,
      customerName: body.customerName,
      from: body.from,
      to: body.to,
      details: body.details || `Vade ${body.paymentTermDays} gün`,
      validUntil: body.validUntil,
      status: "Onay bekliyor",
      price: body.price,
      ownerName: user.name,
      createdAt: now(),
      updatedAt: now(),
    }
    data.quotes.unshift(quote)
    logActivity(data, user.name, { type: "quote", id: quote.id, label: quote.number }, "create", `${quote.number} teklifi oluşturuldu · ${money(quote.price)} / sefer.`)
    return quote
  }),

  /** Accept a quote; the client then opens the new-trip flow (teklif → sefer, plan §5.9). */
  "POST /:id/accept": defineHandler({ permission: "quotes:approve" }, ({ data, user, params }) => {
    const quote = findOr404(data.quotes, params.id, "Teklif")
    if (quote.status === "Sefere dönüştü") throw conflict("Bu teklif zaten sefere dönüştürüldü.")
    quote.status = "Kabul edildi"
    quote.updatedAt = now()
    logActivity(data, user.name, { type: "quote", id: quote.id, label: quote.number }, "approve", "Teklif onaylandı.")
    return quote
  }),

  "POST /:id/reject": defineHandler({ permission: "quotes:approve" }, ({ data, user, params }) => {
    const quote = findOr404(data.quotes, params.id, "Teklif")
    quote.status = "Reddedildi"
    quote.updatedAt = now()
    logActivity(data, user.name, { type: "quote", id: quote.id, label: quote.number }, "reject", "Teklif reddedildi.")
    return quote
  }),
})

export const tariffsRouter = createRouter({
  "GET /": defineHandler({ permission: "quotes:view" }, ({ data, query }) =>
    listItems<Tariff>(data.tariffs, query, {
      search: (t) => [t.code, t.customerName, t.from, t.to, t.vehicleType],
      sorts: { price: (t) => t.price, validUntil: (t) => t.validUntil },
    }),
  ),
  "POST /": defineHandler({ permission: "quotes:create", body: tariffCreateSchema }, ({ data, user, body }) => {
    const tariff: Tariff = {
      id: newId("trf"),
      code: `TRF-2026-${String(data.tariffs.length + 16).padStart(3, "0")}`,
      ...body,
      weightRange: body.weightRange || "0–24 ton",
      status: "Aktif",
      ownerName: user.name,
      createdAt: now(),
      updatedAt: now(),
    }
    data.tariffs.unshift(tariff)
    logActivity(data, user.name, { type: "tariff", id: tariff.id, label: tariff.code }, "create", `${tariff.from} → ${tariff.to} tarifesi eklendi.`)
    return tariff
  }),
})

/* ------------------------------------------------------------------ */
/* Costs & profitability                                                */
/* ------------------------------------------------------------------ */

export const costsRouter = createRouter({
  "GET /overview": defineHandler({ permission: "costs:view" }, ({ data }) => {
    const trips = data.trips.map(tripView)
    const revenue = trips.reduce((s, t) => s + t.revenue, 0)
    const cost = trips.reduce((s, t) => s + t.cost, 0)
    const bySource = new Map<string, number>()
    trips.flatMap((t) => t.costItems).forEach((c) => bySource.set(c.source, (bySource.get(c.source) ?? 0) + c.amount))
    const label: Record<string, string> = { Yakıt: "Yakıt", "Şoför masrafı": "Şoför masrafları", "HGS & köprü": "HGS & köprü", "Sabit maliyet payı": "Sabit maliyet payı", Manuel: "Diğer" }
    const overview: CostOverview = {
      revenue,
      cost,
      profit: revenue - cost,
      margin: revenue ? (revenue - cost) / revenue : 0,
      series: { week: weekSeries(data), month: monthSeries(data) },
      breakdown: [...bySource.entries()].map(([k, v]) => ({ label: label[k] ?? k, value: v })).sort((a, b) => b.value - a.value),
    }
    return overview
  }),

  /** Sefer / müşteri / hat bazlı kârlılık — real grouping. */
  "GET /profitability": defineHandler({ permission: "costs:view" }, ({ data, searchParams }) => {
    const group = searchParams.get("group") ?? "trip"
    const trips = data.trips.map(tripView)
    const rows = new Map<string, ProfitRow>()
    for (const t of trips) {
      const key = group === "customer" ? t.customerName : group === "route" ? `${t.from} → ${t.to}` : t.id
      const row = rows.get(key) ?? {
        key,
        label: group === "customer" ? t.customerName : group === "route" ? `${t.from} → ${t.to}` : t.number,
        sub: group === "trip" ? t.customerName : "",
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        tripId: group === "trip" ? t.id : undefined,
      }
      row.revenue += t.revenue
      row.cost += t.cost
      rows.set(key, row)
    }
    const counts = new Map<string, number>()
    trips.forEach((t) => {
      const key = group === "customer" ? t.customerName : group === "route" ? `${t.from} → ${t.to}` : t.id
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return [...rows.values()]
      .map((r) => {
        const profit = r.revenue - r.cost
        const budget = r.revenue * 0.75
        return {
          ...r,
          sub: group === "trip" ? r.sub : `${counts.get(r.key)} sefer`,
          profit,
          margin: r.revenue ? profit / r.revenue : 0,
          budgetVariance: budget ? (budget - r.cost) / budget : 0,
        }
      })
      .sort((a, b) => b.profit - a.profit)
  }),
})

/* ------------------------------------------------------------------ */
/* Invoices & receivables                                               */
/* ------------------------------------------------------------------ */

function invoicePrep(data: TenantData): InvoiceDraft[] {
  const linked = new Set(data.invoices.flatMap((i) => i.tripIds))
  const auto = data.trips
    .map(tripView)
    .filter((t) => t.status === "Tamamlandı" && t.docsDone === t.docsTotal && !linked.has(t.id))
    .map<InvoiceDraft>((t) => ({
      id: `auto_${t.id}`,
      number: t.number,
      customerName: t.customerName,
      period: `Kapanan seferden otomatik · ${t.docsDone}/${t.docsTotal} belge`,
      tripIds: [t.id],
      tripCount: 1,
      documentCount: t.docsDone,
      amount: t.revenue,
      status: "Aktarıma hazır",
      date: t.updatedAt.slice(0, 10),
      ownerName: t.ownerName,
      createdAt: t.updatedAt,
      updatedAt: t.updatedAt,
    }))
  return [...auto, ...data.invoices]
}

export const invoicesRouter = createRouter({
  "GET /": defineHandler({ permission: "invoices:view" }, ({ data, query }) =>
    listItems<InvoiceDraft>(invoicePrep(data), query, {
      search: (i) => [i.number, i.customerName, i.period],
      filters: { action: (i) => i.status !== "ERP’ye aktarıldı" },
      sorts: { amount: (i) => i.amount, date: (i) => i.date },
    }),
  ),

  "GET /stats": defineHandler({ permission: "invoices:view" }, ({ data }) => {
    const prep = invoicePrep(data)
    const ready = prep.filter((i) => i.status === "Aktarıma hazır")
    const rec = data.receivables.map(receivableView).filter((r) => !r.collected)
    const overdue = rec.filter((r) => r.overdueDays > 0)
    const stats: StatCard[] = [
      { label: "Hazırlanacak", value: String(prep.filter((i) => i.id.startsWith("auto_")).length), caption: "Evrakı tamam sefer" },
      { label: "Aktarıma hazır", value: money(ready.reduce((s, i) => s + i.amount, 0)), caption: `${ready.length} dosya` },
      { label: "Bekleyen tahsilat", value: money(rec.reduce((s, r) => s + r.amount, 0)), caption: `${rec.length} fatura` },
      { label: "Geciken alacak", value: money(overdue.reduce((s, r) => s + r.amount, 0)), caption: `${overdue.length} fatura`, tone: overdue.length ? "warning" : "default" },
    ]
    return stats
  }),

  "POST /": defineHandler({ permission: "invoices:create", body: invoiceCreateSchema }, ({ data, user, body }) => {
    const invoice: InvoiceDraft = {
      id: newId("inv"),
      number: nextNumber(data.sequences, "invoice", "FTR-2026"),
      customerName: body.customerName,
      period: body.period,
      tripIds: [],
      tripCount: 0,
      documentCount: 0,
      amount: body.amount,
      status: "Evrak bekliyor",
      date: body.date,
      ownerName: user.name,
      createdAt: now(),
      updatedAt: now(),
    }
    data.invoices.unshift(invoice)
    logActivity(data, user.name, { type: "invoice", id: invoice.id, label: invoice.number }, "create", `${invoice.customerName} · ${invoice.period} hazırlık dosyası oluşturuldu.`)
    return invoice
  }),

  /** Evrak bekliyor → Aktarıma hazır → ERP’ye aktarıldı (creates an ERP export record). */
  "POST /:id/advance": defineHandler({ permission: "invoices:approve" }, ({ data, user, params }) => {
    let invoice = data.invoices.find((i) => i.id === params.id)
    if (!invoice && params.id.startsWith("auto_")) {
      const draft = invoicePrep(data).find((i) => i.id === params.id)
      if (!draft) throw badRequest("Hazırlık dosyası bulunamadı.")
      invoice = { ...draft, id: newId("inv"), number: nextNumber(data.sequences, "invoice", "FTR-2026") }
      data.invoices.unshift(invoice)
    }
    if (!invoice) throw badRequest("Hazırlık dosyası bulunamadı.")
    if (invoice.status === "ERP’ye aktarıldı") throw conflict("Bu dosya zaten ERP’ye aktarıldı.")
    if (invoice.status === "Evrak bekliyor") {
      invoice.status = "Aktarıma hazır"
    } else {
      invoice.status = "ERP’ye aktarıldı"
      data.records.unshift({
        id: newId("rec"),
        kind: "invoices.erpExport",
        title: `${invoice.customerName} · ${invoice.period} fatura kalemleri`,
        subtitle: `Excel dosyası · ${invoice.tripCount} sefer · ${invoice.documentCount} ek`,
        ref: `AKT-2026-${String(data.records.filter((r) => r.kind === "invoices.erpExport").length + 23).padStart(3, "0")}`,
        ownerName: user.name,
        date: today(),
        detail: formatDate(today()),
        status: "Tamamlandı",
        amount: invoice.amount,
        createdAt: now(),
        updatedAt: now(),
      })
    }
    invoice.updatedAt = now()
    logActivity(data, user.name, { type: "invoice", id: invoice.id, label: invoice.number }, "advance", `Fatura dosyası: ${invoice.status}.`)
    return invoice
  }),
})

export const receivablesRouter = createRouter({
  "GET /": defineHandler({ permission: "invoices:view" }, ({ data, query }) =>
    listItems<ReceivableView>(data.receivables.map(receivableView), query, {
      search: (r) => [r.title, r.invoiceNumber, r.erpNumber, r.customerName],
      filters: { action: (r) => r.overdueDays > 0 },
      sorts: { dueDate: (r) => r.dueDate, amount: (r) => r.amount },
      defaultSort: (a, b) => Number(a.collected) - Number(b.collected) || a.dueDate.localeCompare(b.dueDate),
    }),
  ),
  "POST /:id/collect": defineHandler({ permission: "invoices:approve" }, ({ data, user, params }) => {
    const r = findOr404(data.receivables, params.id, "Alacak")
    r.collected = true
    r.updatedAt = now()
    logActivity(data, user.name, { type: "receivable", id: r.id, label: r.invoiceNumber }, "collect", `${r.title} tahsil edildi · ${money(r.amount)}.`)
    return receivableView(r)
  }),
})

/* ------------------------------------------------------------------ */
/* Ledger (cari hesaplar)                                               */
/* ------------------------------------------------------------------ */

export const ledgerRouter = createRouter({
  "GET /": defineHandler({ permission: "ledger:view" }, ({ data, query }) =>
    listItems<LedgerEntryView>(data.ledger.map(ledgerView), query, {
      search: (e) => [e.party, e.description, e.number],
      tabs: {
        Alacaklarımız: (e) => e.direction === "Alacak" && e.status !== "Kapandı",
        Borçlarımız: (e) => e.direction === "Borç" && e.status !== "Kapandı",
        "Vadesi gelenler": isLedgerDue,
        Kapananlar: (e) => e.status === "Kapandı",
      },
      sorts: { party: (e) => e.party, amount: (e) => e.amount, remaining: (e) => e.remaining, dueDate: (e) => e.dueDate },
      defaultSort: (a, b) => Number(a.status === "Kapandı") - Number(b.status === "Kapandı") || a.dueDate.localeCompare(b.dueDate),
    }),
  ),

  "GET /summary": defineHandler({ permission: "ledger:view" }, ({ data }) => {
    const open = data.ledger.map(ledgerView).filter((e) => e.status !== "Kapandı")
    const receivable = open.filter((e) => e.direction === "Alacak").reduce((s, e) => s + e.remaining, 0)
    const payable = open.filter((e) => e.direction === "Borç").reduce((s, e) => s + e.remaining, 0)
    const summary: LedgerSummary = { receivable, payable, net: receivable - payable, due: open.filter(isLedgerDue) }
    return { ...summary, parties: [...new Set(data.ledger.map((e) => e.party))] }
  }),

  "GET /:id": defineHandler({ permission: "ledger:view" }, ({ data, params }) => ledgerView(findOr404(data.ledger, params.id, "Cari kayıt"))),

  "POST /": defineHandler({ permission: "ledger:create", body: ledgerCreateSchema }, ({ data, user, body }) => {
    const entry: LedgerEntry = {
      id: newId("led"),
      number: nextNumber(data.sequences, "ledger", "CR-2026", 3),
      party: body.party,
      direction: body.direction,
      amount: body.amount,
      dueDate: body.dueDate,
      description: body.description || "Cari kayıt",
      payments: [],
      settled: false,
      createdAt: now(),
      updatedAt: now(),
    }
    data.ledger.unshift(entry)
    logActivity(data, user.name, { type: "ledger", id: entry.id, label: entry.number }, "create", `${entry.party} için ${money(entry.amount)} ${entry.direction.toLocaleLowerCase("tr")} kaydı eklendi. Vade: ${formatDate(entry.dueDate)}.`)
    return ledgerView(entry)
  }),

  /** Parçalı ödeme — kalan tutar otomatik düşer; sıfırlanınca kayıt kapanır. */
  "POST /:id/payments": defineHandler({ permission: "ledger:update", body: ledgerPaymentSchema }, ({ data, user, params, body }) => {
    const entry = findOr404(data.ledger, params.id, "Cari kayıt")
    const view = ledgerView(entry)
    if (view.status === "Kapandı") throw conflict("Kapanmış kayda ödeme girilemez.")
    if (body.amount > view.remaining)
      throw badRequest(`Ödeme kalan tutardan (${money(view.remaining)}) fazla olamaz.`, { amount: `En fazla ${money(view.remaining)}` })
    entry.payments.push({ id: newId("pay"), amount: body.amount, date: body.date, note: body.note })
    const after = ledgerView(entry)
    if (after.remaining === 0) entry.settled = true
    entry.updatedAt = now()
    logActivity(data, user.name, { type: "ledger", id: entry.id, label: entry.number }, "payment", `${money(body.amount)} ödeme kaydedildi. Kalan: ${money(after.remaining)}.`)
    return ledgerView(entry)
  }),

  "PATCH /:id": defineHandler({ permission: "ledger:update", body: ledgerAmountSchema }, ({ data, user, params, body }) => {
    const entry = findOr404(data.ledger, params.id, "Cari kayıt")
    const before = entry.amount
    entry.amount = body.amount
    entry.settled = body.amount <= ledgerView(entry).paid
    entry.updatedAt = now()
    logActivity(data, user.name, { type: "ledger", id: entry.id, label: entry.number }, "update", `Kayıt tutarı ${money(body.amount)} olarak güncellendi.`, [
      { field: "amount", from: before, to: body.amount },
    ])
    return ledgerView(entry)
  }),

  "POST /:id/settle": defineHandler({ permission: "ledger:update" }, ({ data, user, params }) => {
    const entry = findOr404(data.ledger, params.id, "Cari kayıt")
    const view = ledgerView(entry)
    if (view.remaining > 0) entry.payments.push({ id: newId("pay"), amount: view.remaining, date: today(), note: "Tamamı ödendi" })
    entry.settled = true
    entry.updatedAt = now()
    logActivity(data, user.name, { type: "ledger", id: entry.id, label: entry.number }, "settle", `${entry.party} kaydı tamamen ödendi olarak işaretlendi; vade uyarısı kapandı.`)
    return ledgerView(entry)
  }),
})
