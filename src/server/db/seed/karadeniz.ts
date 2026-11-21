/**
 * Second demo tenant on the "Başlangıç" tier — proves data isolation and
 * package/limit behaviour (no Kalite, Ticari, Portal… modules).
 */
import { DEMO_TODAY } from "@/shared/lib/clock"
import type { Tenant } from "@/shared/contracts/tenancy"
import type { TenantData } from "../types"
import { buildRoles, makeUser, stamp } from "./helpers"

const T = DEMO_TODAY
export const TENANT_ID = "tnt_karadeniz"

export const tenant: Tenant = {
  id: TENANT_ID,
  slug: "karadeniz",
  name: "Karadeniz Nakliyat",
  legalName: "Karadeniz Nakliyat ve Ticaret A.Ş.",
  taxOffice: "Trabzon",
  taxNumber: "482 117 3301",
  address: "Değirmendere Mah. Sahil Cad. No: 9, Ortahisar / Trabzon",
  phone: "+90 462 321 44 10",
  email: "info@karadeniznakliyat.com",
  site: "Trabzon (Merkez)",
  departments: ["Yönetim"],
  plan: "starter",
  addons: [],
  status: "Deneme",
  partnerId: "prt_anadolu",
  storageUsedGb: 0.4,
  settings: {
    notifications: { "Belge bitiş uyarıları · 30 / 15 / 7 gün": true, "Sefer durumu güncellemeleri": true },
    templates: { "Yurt içi · Komple": true },
  },
  createdAt: stamp("2026-10-20"),
  updatedAt: stamp(T),
}

export function buildKaradeniz(): TenantData {
  const roles = buildRoles(TENANT_ID)
  const owner = roles.find((r) => r.key === "owner")!
  const ts = stamp(T)
  return {
    users: [
      makeUser(TENANT_ID, owner, { id: "usr_hakan", name: "Hakan Uzun", email: "hakan@karadeniznakliyat.com", title: "Genel müdür", department: "Yönetim" }),
    ],
    roles,
    customers: [
      { id: "cus_hopa", name: "Hopa Çay Fabrikası", code: "MŞT-0001", sector: "Gıda · Çay", contactName: "Nuri Bilgin", paymentTermDays: 30, status: "Aktif", tripsLastMonth: 5, revenueLastMonth: 92000, createdAt: ts, updatedAt: ts },
    ],
    trips: [
      {
        id: "trp_k001", number: "SFR-2026-0001", date: T, time: "15:00", customerId: "cus_hopa", customerName: "Hopa Çay Fabrikası", from: "Rize", to: "İstanbul",
        vehicleId: "veh_k1", plate: "61 KN 201", driverId: "emp_k1", driverName: "Temel Aydın", status: "Yolda", operationType: "Yurt içi · Komple", type: "Komple · Tenteli",
        revenue: 31000, costItems: [{ id: "k1c", name: "Yakıt gideri", amount: 15400, source: "Yakıt" }, { id: "k2c", name: "Şoför masrafı", amount: 3300, source: "Şoför masrafı" }],
        documents: ["Sevk irsaliyesi", "Kantar fişi", "Yükleme tutanağı", "Teslimat kanıtı (POD)"].map((name, i) => ({ name, uploaded: i < 2, version: 1 })),
        checklist: [{ label: "Araç ve şoför uygunluğunu doğrula", done: true, assigneeName: "Hakan Uzun" }],
        cargo: { description: "Kuru çay · Çuval", weightVolume: "20.000 kg", pallets: "18 palet", customerRef: "HCF-2026-118", note: "Nemden korunmalı." },
        loadingAddress: "Hopa Sanayi Sitesi No: 4", deliveryAddress: "Esenyurt Lojistik Merkezi", ownerName: "Hakan Uzun", createdAt: ts, updatedAt: ts,
      },
    ],
    loads: [],
    vehicles: [
      { id: "veh_k1", plate: "61 KN 201", model: "Mercedes-Benz Actros 1845", year: 2020, kind: "Çekici", body: "Çekici · Tenteli dorse", capacity: "24 ton", ownership: "Öz mal", driverId: "emp_k1", driverName: "Temel Aydın", km: 356200, status: "Yolda", nextServiceLabel: "18 Kas · Periyodik bakım", nextServiceDate: "2026-11-18", createdAt: ts, updatedAt: ts },
      { id: "veh_k2", plate: "61 KN 202", model: "Iveco S-Way", year: 2022, kind: "Çekici", body: "Çekici · Tenteli dorse", capacity: "24 ton", ownership: "Öz mal", driverId: "emp_k2", driverName: "Recai Kurt", km: 198400, status: "Müsait", nextServiceLabel: "02 Ara · Periyodik bakım", nextServiceDate: "2026-12-02", createdAt: ts, updatedAt: ts },
    ],
    employees: [
      { id: "emp_kh", name: "Hakan Uzun", role: "Şirket yöneticisi", phone: "+90 532 600 11 22", email: "hakan@karadeniznakliyat.com", startDate: "2015-04-01", status: "Aktif", department: "Yönetim", createdAt: ts, updatedAt: ts },
      { id: "emp_k1", name: "Temel Aydın", role: "Şoför", phone: "+90 535 410 22 33", vehicleId: "veh_k1", plate: "61 KN 201", startDate: "2019-02-11", src: "SRC 4", srcExpiry: "2027-08-01", score: 91, status: "Seferde", department: "Operasyon", createdAt: ts, updatedAt: ts },
      { id: "emp_k2", name: "Recai Kurt", role: "Şoför", phone: "+90 536 711 33 44", vehicleId: "veh_k2", plate: "61 KN 202", startDate: "2021-06-07", src: "SRC 4", srcExpiry: "2027-01-15", score: 88, status: "Müsait", department: "Operasyon", createdAt: ts, updatedAt: ts },
    ],
    documents: [
      { id: "kdoc_1", name: "Zorunlu trafik sigortası", ownerType: "Araç", ownerRef: "61 KN 201", responsibleName: "Hakan Uzun", expiresAt: "2026-11-25", version: 1, approved: true, archived: false, createdAt: ts, updatedAt: ts },
      { id: "kdoc_2", name: "K1 yetki belgesi", ownerType: "Şirket", ownerRef: tenant.name, responsibleName: "Hakan Uzun", expiresAt: "2028-05-01", version: 1, approved: true, archived: false, createdAt: ts, updatedAt: ts },
    ],
    quotas: [],
    expenses: [],
    records: [],
    quotes: [],
    tariffs: [],
    invoices: [],
    receivables: [],
    ledger: [],
    tasks: [
      { id: "ktsk_1", title: "61 KN 201 trafik sigortası yenileme teklifi al", description: "", relatedRef: "61 KN 201", assigneeName: "Hakan Uzun", dueDate: "2026-11-10", priority: "Normal", status: "Bekliyor", checklist: [], createdAt: ts, updatedAt: ts },
    ],
    claims: [],
    channels: [],
    messages: [],
    savedReports: [],
    scheduledReports: [],
    rules: [],
    ruleRuns: [],
    notifications: [],
    activities: [],
    comments: [],
    history: { daily: {}, weekly: [] },
    sequences: { trip: 1, quote: 0, ledger: 0, invoice: 0, claim: 0, record: 0, document: 0 },
  }
}
