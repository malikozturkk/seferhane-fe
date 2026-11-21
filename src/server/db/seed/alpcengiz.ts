/**
 * Demo tenant "Alp Cengiz Lojistik" — ported from the Figma Make prototype
 * (src/data.ts). Values are kept identical so every screen matches the design.
 */
import { addDays, DEMO_TODAY } from "@/shared/lib/clock"
import type { Customer, InvoiceDraft, LedgerEntry, Quote, Receivable, Tariff } from "@/shared/contracts/commercial"
import type { AutomationRule, Channel, Claim, Message, RuleRun, Task } from "@/shared/contracts/management"
import type { Load, Trip, TripCostItem, TripStatus } from "@/shared/contracts/operations"
import type {
  ComplianceDocument,
  Employee,
  ExpenseCategory,
  PermitQuota,
  Vehicle,
  VehicleExpense,
  WorkRecord,
} from "@/shared/contracts/resources"
import type { Activity } from "@/shared/contracts/common"
import type { Tenant } from "@/shared/contracts/tenancy"
import type { TenantData } from "../types"
import { buildRoles, makeUser, stamp } from "./helpers"

const T = DEMO_TODAY
const ts = stamp
export const TENANT_ID = "tnt_alpcengiz"

export const tenant: Tenant = {
  id: TENANT_ID,
  slug: "alpcengiz",
  name: "Alp Cengiz Lojistik",
  legalName: "Alp Cengiz Lojistik ve Taşımacılık Ltd. Şti.",
  taxOffice: "Tuzla",
  taxNumber: "061 234 5678",
  address: "Orhanlı Mahallesi, Lojistik Caddesi No: 14, Tuzla / İstanbul",
  phone: "+90 216 394 20 10",
  email: "operasyon@alpcengizlojistik.com",
  site: "İstanbul · Tuzla (Merkez)",
  departments: ["Yönetim", "Operasyon"],
  plan: "professional",
  addons: ["external", "analytics"],
  status: "Aktif",
  partnerId: "prt_guven",
  storageUsedGb: 3.2,
  settings: {
    notifications: {
      "Belge bitiş uyarıları · 30 / 15 / 7 gün": true,
      "Sefer durumu güncellemeleri": true,
      "Günlük operasyon özeti · E-posta": false,
      "Görev & onay bildirimleri": true,
      "Haftalık yönetici raporu": false,
    },
    templates: {
      "Yurt içi · Komple": true,
      Uluslararası: true,
      "ADR · Tehlikeli madde": false,
      "Frigo · Soğuk zincir": true,
    },
  },
  createdAt: ts("2026-01-05"),
  updatedAt: ts(T),
}

const ADMIN = "Muhammet Karaalp"
const MANAGER = "Recep Belit"

/* ------------------------------------------------------------------ */
/* People & vehicles                                                    */
/* ------------------------------------------------------------------ */

const employees: Employee[] = [
  { id: "emp_karaalp", name: ADMIN, role: "Şirket yöneticisi", phone: "+90 532 410 20 10", email: "muhammet@alpcengizlojistik.com", vehicleId: "veh_hfv698", plate: "34 HFV 698", startDate: "2018-01-02", status: "Aktif", department: "Yönetim" },
  { id: "emp_belit", name: MANAGER, role: "Müdür", phone: "+90 533 745 18 62", email: "recep@alpcengizlojistik.com", vehicleId: "veh_jh2362", plate: "34 JH 2362", startDate: "2019-08-12", status: "Aktif", department: "Operasyon" },
  { id: "emp_erdogan", name: "Galip Erdoğan", role: "Şoför", phone: "+90 532 456 78 90", vehicleId: "veh_hzn614", plate: "34 HZN 614", startDate: "2022-03-14", src: "SRC 4", srcExpiry: "2026-11-18", score: 96, status: "Seferde", department: "Operasyon" },
  { id: "emp_civelek", name: "Şerafettin Civelek", role: "Şoför", phone: "+90 533 218 45 61", vehicleId: "veh_dje399", plate: "34 DJE 399", startDate: "2024-06-03", src: "SRC 4", srcExpiry: "2027-02-12", score: 94, status: "Seferde", department: "Operasyon" },
  { id: "emp_yildiz", name: "Mehmet Yıldız", role: "Şoför", phone: "+90 542 775 12 08", vehicleId: "veh_eag528", plate: "34 EAG 528", startDate: "2020-01-20", src: "SRC 3", srcExpiry: "2027-03-20", score: 98, status: "Müsait", department: "Operasyon" },
  { id: "emp_turkmen", name: "Meriç Türkmen", role: "Şoför", phone: "+90 505 334 90 27", vehicleId: "veh_rlj165", plate: "34 RLJ 165", startDate: "2025-09-01", src: "SRC 4", srcExpiry: "2027-04-30", score: 90, status: "Müsait", department: "Operasyon" },
  { id: "emp_ozer", name: "Yunus Özer", role: "Şoför", phone: "+90 530 612 48 73", vehicleId: "veh_hn8416", plate: "34 HN 8416", startDate: "2023-05-15", src: "SRC 4", srcExpiry: "2027-06-01", score: 92, status: "Müsait", department: "Operasyon" },
].map((e) => ({ ...e, createdAt: ts(e.startDate), updatedAt: ts(T) })) as Employee[]

const vehicles: Vehicle[] = [
  { id: "veh_hzn614", plate: "34 HZN 614", model: "Mercedes-Benz Actros 1848", year: 2023, kind: "Çekici", body: "Çekici · Tenteli dorse", capacity: "24 ton", driverId: "emp_erdogan", driverName: "Galip Erdoğan", km: 248520, status: "Yolda", nextServiceDate: "2026-11-12", nextServiceLabel: "12 Kas · Periyodik bakım" },
  { id: "veh_dje399", plate: "34 DJE 399", model: "Volvo FH 500", year: 2022, kind: "Çekici", body: "Çekici · Tenteli dorse", capacity: "24 ton", driverId: "emp_civelek", driverName: "Şerafettin Civelek", km: 312780, status: "Yüklemede", nextServiceDate: "2026-11-06", nextServiceLabel: "06 Kas · Yağ değişimi" },
  { id: "veh_eag528", plate: "34 EAG 528", model: "Ford F-MAX", year: 2024, kind: "Çekici", body: "Çekici · Açık kasa dorse", capacity: "26 ton", driverId: "emp_yildiz", driverName: "Mehmet Yıldız", km: 124360, status: "Müsait", nextServiceDate: "2026-11-22", nextServiceLabel: "22 Kas · Periyodik bakım" },
  { id: "veh_rlj165", plate: "34 RLJ 165", model: "Renault T 480", year: 2019, kind: "Çekici", body: "Çekici · Tenteli dorse", capacity: "24 ton", driverId: "emp_turkmen", driverName: "Meriç Türkmen", assignmentUntil: "2027-03-31", km: 412300, status: "Bakımda", nextServiceDate: "2026-11-03", nextServiceLabel: "03 Kas · Fren sistemi", note: "Muayene süresi doldu" },
  { id: "veh_hn8416", plate: "34 HN 8416", model: "Mercedes-Benz Atego 1524", year: 2021, kind: "Kamyon", body: "Kamyon · Frigo", capacity: "10 ton", driverId: "emp_ozer", driverName: "Yunus Özer", km: 186420, status: "Müsait", nextServiceDate: "2026-11-25", nextServiceLabel: "25 Kas · Soğutucu bakımı" },
  { id: "veh_jh2362", plate: "34 JH 2362", model: "Ford Transit 350 L", year: 2022, kind: "Hizmet aracı", body: "Hizmet aracı · Panelvan", capacity: "1,5 ton", driverId: "emp_belit", driverName: MANAGER, km: 86400, status: "Müsait", nextServiceDate: "2026-12-15", nextServiceLabel: "15 Ara · Periyodik bakım" },
  { id: "veh_hfv698", plate: "34 HFV 698", model: "Ford Ranger", year: 2023, kind: "Hizmet aracı", body: "Hizmet aracı · Pickup", capacity: "1 ton", driverId: "emp_karaalp", driverName: ADMIN, km: 41200, status: "Müsait", nextServiceDate: "2027-01-20", nextServiceLabel: "20 Oca · Periyodik bakım" },
].map((v) => ({ ...v, ownership: "Öz mal", createdAt: ts(`${v.year}-01-15`), updatedAt: ts(T) })) as Vehicle[]

/* ------------------------------------------------------------------ */
/* Customers                                                            */
/* ------------------------------------------------------------------ */

const customers: Customer[] = [
  { id: "cus_arcelik", name: "Arçelik A.Ş.", code: "MŞT-0012", sector: "Üretim · Beyaz eşya", contactName: "Ayşe Güner", contactEmail: "ayse.guner@arcelik.com.tr", paymentTermDays: 30, tripsLastMonth: 8, revenueLastMonth: 196000 },
  { id: "cus_hayat", name: "Hayat Kimya", code: "MŞT-0008", sector: "Üretim · Tüketim ürünleri", contactName: "Burak Eren", paymentTermDays: 45, tripsLastMonth: 6, revenueLastMonth: 168000 },
  { id: "cus_sisecam", name: "Şişecam", code: "MŞT-0024", sector: "Üretim · Cam", contactName: "Derya Şen", paymentTermDays: 30, tripsLastMonth: 4, revenueLastMonth: 146000 },
  { id: "cus_ulker", name: "Ülker Bisküvi", code: "MŞT-0015", sector: "Gıda · FMCG", contactName: "Cem Korkmaz", paymentTermDays: 60, tripsLastMonth: 4, revenueLastMonth: 88000 },
  { id: "cus_eczacibasi", name: "Eczacıbaşı", code: "MŞT-0019", sector: "Sağlık · Tüketim ürünleri", contactName: "Deniz Akın", paymentTermDays: 30, tripsLastMonth: 3, revenueLastMonth: 58500 },
  { id: "cus_bosch", name: "Bosch Türkiye", code: "MŞT-0031", sector: "Üretim · Otomotiv parçaları", contactName: "Serkan Öz", paymentTermDays: 30, tripsLastMonth: 3, revenueLastMonth: 54000 },
].map((c) => ({ ...c, status: "Aktif", createdAt: ts("2025-06-01"), updatedAt: ts(T) })) as Customer[]

/* ------------------------------------------------------------------ */
/* Trips                                                                */
/* ------------------------------------------------------------------ */

export const TRIP_DOCUMENTS = ["Sevk irsaliyesi", "Kantar fişi", "Yükleme tutanağı", "Teslimat kanıtı (POD)"]

const CARGO: Record<string, [string, string, string, string]> = {
  cus_arcelik: ["Beyaz eşya · Paletli ürün", "18.500 kg / 72 m³", "24 Euro palet", "ARC-SIP-2026-1492"],
  cus_hayat: ["Temizlik ürünleri · Koli", "21.200 kg / 80 m³", "30 Euro palet", "HK-2026-0871"],
  cus_sisecam: ["Düz cam · Sehpalı", "24.800 kg / 36 m³", "12 cam sehpası", "SSC-2026-3310"],
  cus_ulker: ["Bisküvi · Soğuk zincir", "8.400 kg / 42 m³", "14 Euro palet", "ULK-2026-5520"],
  cus_eczacibasi: ["Kişisel bakım ürünleri", "16.900 kg / 68 m³", "22 Euro palet", "ECZ-2026-0944"],
  cus_bosch: ["Otomotiv parçaları · Kasalı", "15.200 kg / 60 m³", "20 Euro palet", "BSH-2026-1207"],
}

const STAGE: Record<TripStatus, number> = {
  Planlandı: 0,
  "Şoföre iletildi": 1,
  Yüklemede: 2,
  Yolda: 3,
  "Teslim edildi": 4,
  "Evrak bekliyor": 4,
  Tamamlandı: 5,
}

/** Make derives trip cost lines from a base cost with fixed shares. */
export function splitCost(tripKey: string, cost: number): TripCostItem[] {
  const fuel = Math.round(cost * 0.64)
  const driver = Math.round(cost * 0.14)
  const hgs = Math.round(cost * 0.12)
  return [
    { id: `${tripKey}_c1`, name: "Yakıt gideri", amount: fuel, source: "Yakıt" },
    { id: `${tripKey}_c2`, name: "Şoför masrafı", amount: driver, source: "Şoför masrafı" },
    { id: `${tripKey}_c3`, name: "HGS & köprü", amount: hgs, source: "HGS & köprü" },
    { id: `${tripKey}_c4`, name: "Sabit maliyet payı", amount: cost - fuel - driver - hgs, source: "Sabit maliyet payı" },
  ]
}

type TripSeed = Omit<Trip, "createdAt" | "updatedAt" | "costItems" | "documents" | "checklist" | "cargo" | "loadingAddress" | "deliveryAddress" | "ownerName"> & {
  cost: number
  docs: number
}

const tripSeeds: TripSeed[] = [
  { id: "trp_0842", number: "SFR-2026-0842", date: T, time: "14:30", customerId: "cus_arcelik", customerName: "Arçelik A.Ş.", from: "İstanbul", to: "Ankara", vehicleId: "veh_hzn614", plate: "34 HZN 614", driverId: "emp_erdogan", driverName: "Galip Erdoğan", status: "Yolda", operationType: "Yurt içi · Komple", type: "Komple · Tenteli", revenue: 24500, cost: 18200, docs: 3 },
  { id: "trp_0841", number: "SFR-2026-0841", date: T, time: "18:30", customerId: "cus_hayat", customerName: "Hayat Kimya", from: "Kocaeli", to: "İzmir", vehicleId: "veh_dje399", plate: "34 DJE 399", driverId: "emp_civelek", driverName: "Şerafettin Civelek", status: "Yüklemede", operationType: "Yurt içi · Komple", type: "Komple · Tenteli", revenue: 28000, cost: 21400, docs: 2 },
  { id: "trp_0840", number: "SFR-2026-0840", date: T, time: "16:00", customerId: "cus_sisecam", customerName: "Şişecam", from: "Bursa", to: "Gaziantep", vehicleId: "veh_eag528", plate: "34 EAG 528", driverId: "emp_yildiz", driverName: "Mehmet Yıldız", status: "Planlandı", operationType: "Yurt içi · Komple", type: "Komple · Açık kasa", revenue: 36500, cost: 27200, docs: 1 },
  {
    id: "trp_0839", number: "SFR-2026-0839", date: T, time: "11:45", customerId: "cus_ulker", customerName: "Ülker Bisküvi", from: "İstanbul", to: "Konya", vehicleId: "veh_hn8416", plate: "34 HN 8416", driverId: "emp_ozer", driverName: "Yunus Özer", status: "Teslim edildi", operationType: "Frigo · Soğuk zincir", type: "Parsiyel · Frigo", revenue: 22000, cost: 16100, docs: 4,
    closing: {
      fuelOut: 260, fuelIn: 95, fuelBought: 0, km: 668, advance: 3000, note: "Soğuk zincir kaydı +4 °C, teslimat sorunsuz.",
      expenses: [
        { id: "x1", name: "HGS · Kuzey Marmara", amount: 486, date: T },
        { id: "x2", name: "Yemek", amount: 320, date: T },
        { id: "x3", name: "Otopark", amount: 150, date: T },
      ],
      invoices: [
        { id: "f1", name: "ULK-sevk-irsaliyesi-5520.pdf", size: "412 KB", date: T },
        { id: "f2", name: "ULK-fatura-2026-11-03.pdf", size: "286 KB", date: T },
      ],
    },
  },
  {
    id: "trp_0838", number: "SFR-2026-0838", date: T, time: "10:20", customerId: "cus_eczacibasi", customerName: "Eczacıbaşı", from: "Eskişehir", to: "İstanbul", vehicleId: "veh_eag528", plate: "34 EAG 528", driverId: "emp_yildiz", driverName: "Mehmet Yıldız", status: "Evrak bekliyor", operationType: "Yurt içi · Komple", type: "Komple · Tenteli", revenue: 19500, cost: 14800, docs: 3,
    closing: {
      fuelOut: 300, fuelIn: 160, fuelBought: 0, km: 342, advance: 2000,
      expenses: [
        { id: "x1", name: "Köprü / otoyol", amount: 410, date: T },
        { id: "x2", name: "Yemek", amount: 280, date: T },
      ],
      invoices: [{ id: "f1", name: "ECZ-sevk-irsaliyesi-0944.pdf", size: "398 KB", date: T }],
    },
  },
  {
    id: "trp_0837", number: "SFR-2026-0837", date: "2026-11-02", time: "09:15", customerId: "cus_bosch", customerName: "Bosch Türkiye", from: "Bursa", to: "İstanbul", vehicleId: "veh_eag528", plate: "34 EAG 528", driverId: "emp_yildiz", driverName: "Mehmet Yıldız", status: "Tamamlandı", operationType: "Yurt içi · Komple", type: "Komple · Tenteli", revenue: 18000, cost: 13900, docs: 4,
    closing: {
      fuelOut: 420, fuelIn: 250, fuelBought: 0, km: 312, advance: 1500, note: "Dönüşte boş geldi.",
      expenses: [
        { id: "x1", name: "HGS · Osmangazi Köprüsü", amount: 1240, date: "2026-11-02" },
        { id: "x2", name: "Yemek", amount: 260, date: "2026-11-02" },
      ],
      invoices: [
        { id: "f1", name: "BSH-sevk-irsaliyesi-1207.pdf", size: "355 KB", date: "2026-11-02" },
        { id: "f2", name: "BSH-fatura-2026-11-02.pdf", size: "301 KB", date: "2026-11-02" },
      ],
    },
  },
]

export function buildTrip(seed: TripSeed): Trip {
  const { cost, docs, ...rest } = seed
  const stage = STAGE[seed.status]
  const cargo = CARGO[seed.customerId] ?? ["Genel kargo · Paletli", "16.000 kg / 60 m³", "20 Euro palet", "—"]
  return {
    ...rest,
    costItems: splitCost(seed.id, cost),
    documents: TRIP_DOCUMENTS.map((name, i) => ({
      name,
      uploaded: i < docs,
      fileName: i < docs ? `${seed.number}-${i + 1}.pdf` : undefined,
      size: i < docs ? "1,2 MB" : undefined,
      uploadedAt: i < docs ? ts(seed.date) : undefined,
      version: 1,
    })),
    checklist: [
      { label: "Araç ve şoför uygunluğunu doğrula", done: true, assigneeName: MANAGER },
      { label: "Yükleme evraklarını kontrol et", done: stage >= 2, assigneeName: MANAGER },
      { label: "Kantar fişini dosyaya ekle", done: docs >= 2, assigneeName: ADMIN },
      { label: "Teslimat POD belgesini onayla", done: docs === 4, assigneeName: ADMIN },
    ],
    cargo: {
      description: cargo[0],
      weightVolume: cargo[1],
      pallets: cargo[2],
      customerRef: cargo[3],
      note: seed.type.includes("Frigo") ? "Soğuk zincir: +2 / +6 °C aralığında taşınmalı." : "Dik taşınmalı. Üst üste istiflenmez.",
    },
    loadingAddress: "Organize Sanayi Bölgesi, 3. Cadde No: 18",
    deliveryAddress: "Organize Sanayi Bölgesi, Lojistik Caddesi No: 42",
    ownerName: MANAGER,
    createdAt: `${addDays(seed.date, -1)}T16:42:00.000Z`,
    updatedAt: ts(seed.date),
  }
}

const loads: Load[] = [
  { id: "lod_vestel", customerName: "Vestel Elektronik", from: "Manisa", to: "İstanbul", weight: "18 ton · 24 palet", date: T, time: "13:00", color: "blue", revenue: 26500, cost: 19600 },
  { id: "lod_migros", customerName: "Migros Ticaret", from: "İstanbul", to: "Antalya", weight: "12 ton · Frigo", date: T, time: "15:00", color: "purple", revenue: 32000, cost: 24100 },
  { id: "lod_pinar", customerName: "Pınar Süt", from: "İzmir", to: "Bursa", weight: "8 ton · Frigo", date: T, time: "16:30", color: "green", revenue: 17500, cost: 13200 },
].map((l) => ({ ...l, createdAt: ts(T), updatedAt: ts(T) })) as Load[]

/* ------------------------------------------------------------------ */
/* Documents                                                            */
/* ------------------------------------------------------------------ */

function buildDocuments(): ComplianceDocument[] {
  const expiry = ["2027-03-14", "2027-06-22", "2027-09-09", "2027-01-30", "2027-04-17", "2027-02-26", "2027-08-11", "2027-05-25", "2027-07-19", "2026-12-08"]
  const rows: Omit<ComplianceDocument, "id" | "createdAt" | "updatedAt" | "approved" | "archived">[] = []
  vehicles.forEach((v, i) => {
    rows.push({ name: "Araç ruhsatı", ownerType: "Araç", ownerRef: v.plate, responsibleName: MANAGER, expiresAt: null, expiryLabel: "Süresiz", version: 1 })
    rows.push({ name: "Zorunlu trafik sigortası", ownerType: "Araç", ownerRef: v.plate, responsibleName: MANAGER, expiresAt: v.plate === "34 HZN 614" ? "2026-11-08" : expiry[i], version: 2 })
    rows.push({ name: "Araç periyodik muayenesi", ownerType: "Araç", ownerRef: v.plate, responsibleName: MANAGER, expiresAt: v.plate === "34 RLJ 165" ? "2026-11-02" : expiry[(i + 3) % 10], version: 1 })
    rows.push({ name: "Kasko poliçesi", ownerType: "Araç", ownerRef: v.plate, responsibleName: MANAGER, expiresAt: expiry[(i + 5) % 10], version: 2 })
  })
  const license = ["2029-01-12", "2030-07-03", "2028-02-28", "2031-09-15", "2029-04-21"]
  const psycho = ["2029-05-05", "2030-08-17", "2028-01-22", "2030-11-30", "2029-06-09"]
  employees
    .filter((e) => e.role === "Şoför")
    .forEach((d, i) => {
      rows.push({ name: "Sürücü ehliyeti (CE)", ownerType: "Şoför", ownerRef: d.name, responsibleName: MANAGER, expiresAt: license[i], version: 1 })
      rows.push({ name: `${d.src} belgesi`, ownerType: "Şoför", ownerRef: d.name, responsibleName: MANAGER, expiresAt: d.srcExpiry ?? null, version: 1 })
      rows.push({ name: "Psikoteknik raporu", ownerType: "Şoför", ownerRef: d.name, responsibleName: MANAGER, expiresAt: psycho[i], version: 1 })
    })
  rows.push(
    { name: "K1 yetki belgesi", ownerType: "Şirket", ownerRef: tenant.name, responsibleName: ADMIN, expiresAt: "2028-03-14", version: 3 },
    { name: "Vergi levhası", ownerType: "Şirket", ownerRef: tenant.name, responsibleName: ADMIN, expiresAt: null, expiryLabel: "Yıllık", version: 1 },
    { name: "Arçelik taşıma sözleşmesi", ownerType: "Müşteri sözleşmesi", ownerRef: "Arçelik A.Ş.", responsibleName: ADMIN, expiresAt: "2026-12-31", version: 3 },
    { name: "Hayat Kimya taşıma sözleşmesi", ownerType: "Müşteri sözleşmesi", ownerRef: "Hayat Kimya", responsibleName: ADMIN, expiresAt: "2027-06-30", version: 2 },
  )
  const docs: ComplianceDocument[] = rows.map((r, i) => ({
    ...r,
    id: `doc_${String(i + 1).padStart(3, "0")}`,
    approved: true,
    archived: false,
    fileName: `${r.name}.pdf`,
    createdAt: ts("2026-01-10"),
    updatedAt: ts(T),
  }))
  docs.push({
    id: "doc_pod0839",
    name: "Teslimat kanıtı (POD)",
    ownerType: "Operasyon",
    ownerRef: "SFR-2026-0839",
    responsibleName: MANAGER,
    expiresAt: null,
    expiryLabel: "03 Kas 2026",
    version: 1,
    approved: false,
    archived: false,
    fileName: "SFR-2026-0839-POD.jpg",
    source: "WhatsApp'tan alınan fotoğraf",
    createdAt: ts(T),
    updatedAt: ts(T),
  })
  return docs
}

const quotas: PermitQuota[] = [
  { id: "quo_de", country: "Almanya", code: "DE", kind: "İkili geçiş", year: 2026, total: 12, used: 8, responsibleName: ADMIN, createdAt: ts("2026-01-02"), updatedAt: ts(T) },
  { id: "quo_bg", country: "Bulgaristan", code: "BG", kind: "Transit", year: 2026, total: 20, used: 18, responsibleName: ADMIN, createdAt: ts("2026-01-02"), updatedAt: ts(T) },
]

/* ------------------------------------------------------------------ */
/* Vehicle expenses — deterministic 5 year history (Make algorithm)     */
/* ------------------------------------------------------------------ */

function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

function buildVehicleExpenses(): VehicleExpense[] {
  const out: VehicleExpense[] = []
  const end = new Date(`${T}T00:00:00Z`)
  const day = 86400000
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const plus = (d: Date, n: number) => new Date(d.getTime() + n * day)
  vehicles.forEach((v, vi) => {
    const rnd = seeded(vi * 97 + 13)
    const heavy = v.kind !== "Hizmet aracı"
    const start = new Date(`${Math.max(v.year, 2021)}-${v.year > 2021 ? "02" : "11"}-0${(vi % 8) + 1}T00:00:00Z`)
    const add = (date: Date, category: ExpenseCategory, description: string, amount: number) =>
      out.push({
        id: `exp_${v.plate.replace(/ /g, "")}_${out.length}`,
        vehicleId: v.id,
        plate: v.plate,
        date: iso(date),
        category,
        description,
        amount: Math.round(amount / 10) * 10,
      })
    const years = (end.getTime() - start.getTime()) / (365 * day)
    const inflation = (d: Date) => 1 + ((d.getTime() - start.getTime()) / (365 * day)) * 0.32
    for (let d = start; d <= end; d = plus(d, heavy ? 7 : 14)) {
      if (v.status === "Bakımda" && end.getTime() - d.getTime() < 10 * day) continue
      const liters = heavy ? 260 + Math.round(rnd() * 180) : 45 + Math.round(rnd() * 25)
      add(d, "Yakıt", `Motorin · ${liters} L`, liters * 27 * inflation(d))
      if (heavy && rnd() > 0.55) add(plus(d, 2), "HGS & köprü", "HGS / köprü geçişleri", (350 + rnd() * 900) * inflation(d))
    }
    for (let d = plus(start, 45); d <= end; d = plus(d, 120))
      add(d, "Bakım", rnd() > 0.5 ? "Periyodik bakım · yağ & filtre" : "Fren / balata kontrolü", (heavy ? 9000 + rnd() * 9000 : 3500 + rnd() * 2500) * inflation(d))
    for (let y = 0; y <= Math.ceil(years); y++) {
      const base = plus(start, y * 365)
      if (base > end) break
      add(plus(base, 10), "Kasko", "Kasko poliçesi yenileme", (heavy ? 42000 : 18000) * inflation(base))
      add(plus(base, 12), "Trafik sigortası", "Zorunlu trafik sigortası", (heavy ? 16000 : 6500) * inflation(base))
      add(plus(base, 30), "Muayene", "TÜVTÜRK periyodik muayene", (heavy ? 2800 : 1600) * inflation(base))
      if (y % 2 === 1 || heavy) add(plus(base, 200), "Lastik", heavy ? "Lastik değişimi · 2 adet" : "Mevsimlik lastik değişimi", (heavy ? 32000 : 9000) * inflation(base))
      if (rnd() > 0.7) add(plus(base, 150), "Ceza", "Trafik / hız cezası", 1500 + rnd() * 2500)
      if (rnd() > 0.5) add(plus(base, 260), "Diğer", "Yıkama, takograf kalibrasyonu, küçük onarım", (1200 + rnd() * 3000) * inflation(base))
    }
  })
  return out.filter((e) => e.date <= T).sort((a, b) => (a.date < b.date ? 1 : -1))
}

/* ------------------------------------------------------------------ */
/* Secondary records (Make `extraRows` + `records.quality`)            */
/* ------------------------------------------------------------------ */

type RecordSeed = Omit<WorkRecord, "id" | "createdAt" | "updatedAt">
const recordSeeds: RecordSeed[] = [
  { kind: "quality.audit", title: "ISO 9001 iç denetimi", subtitle: "Kalite yönetim sistemi", ref: "DNT-2026-024", ownerName: MANAGER, date: "2026-11-12", status: "Planlandı", amountLabel: "%72 hazırlık", checklist: [true, false, false] },
  { kind: "quality.audit", title: "Araç kontrol prosedürü", subtitle: "Uygunsuzluk · DÖF-018", ref: "34 HZN 614", ownerName: MANAGER, date: "2026-11-06", status: "İncelemede", amountLabel: "Orta risk", checklist: [true, true, false] },
  { kind: "quality.audit", title: "Arçelik tedarikçi denetimi", subtitle: "Müşteri denetimi · Saha değerlendirmesi", ref: "DNT-2026-025", ownerName: ADMIN, date: "2026-11-20", status: "Devam ediyor", amountLabel: "%85 hazırlık", checklist: [true, true, false] },
  { kind: "quality.audit", title: "Güvenli sürüş eğitimi", subtitle: "5 şoför · Sertifikalı", ref: "EGT-2026-012", ownerName: MANAGER, date: "2026-11-02", status: "Tamamlandı", amountLabel: "5 / 5 katılım", checklist: [true, true, true] },
  { kind: "quality.nonconformity", title: "Sefer öncesi kontrol formu eksik", subtitle: "Kök neden: Kontrol adımı atlanmış", ref: "DÖF-2026-018", ownerName: MANAGER, date: "2026-11-06", status: "İncelemede", amountLabel: "Orta risk", rootCause: "Kontrol adımı atlanmış" },
  { kind: "quality.nonconformity", title: "Muayene takip süreci", subtitle: "Düzeltici faaliyet: 30 gün önce otomatik görev", ref: "DÖF-2026-017 · 34 RLJ 165", ownerName: MANAGER, date: "2026-11-08", status: "Devam ediyor", amountLabel: "Düşük risk" },
  { kind: "quality.training", title: "Güvenli sürüş eğitimi", subtitle: "5 şoför · Sertifika programı", ref: "EGT-2026-012", ownerName: MANAGER, date: "2026-11-02", status: "Tamamlandı", amountLabel: "5/5 katılım" },
  { kind: "quality.training", title: "ADR farkındalık eğitimi", subtitle: "2 şoför · Tehlikeli madde", ref: "EGT-2026-013", ownerName: MANAGER, date: "2026-11-15", status: "Planlandı", amountLabel: "2/2 kayıt" },
  { kind: "quality.sop", title: "Sefer öncesi araç kontrol prosedürü", subtitle: "SOP-001 · v3 · Faz 3", ref: "Operasyon", ownerName: MANAGER, date: "2026-11-01", status: "Yayında" },
  { kind: "quality.sop", title: "Yük hasarı bildirim talimatı", subtitle: "SOP-014 · v2 · Faz 3", ref: "Kalite", ownerName: MANAGER, date: "2026-10-20", status: "Yayında" },
  { kind: "fleet.maintenance", title: "Yağ & filtre değişimi", subtitle: "Volvo yetkili servis", ref: "34 DJE 399", ownerName: MANAGER, date: "2026-11-06", detail: "720 km kaldı", status: "3 gün kaldı", amount: 8200 },
  { kind: "fleet.maintenance", title: "Periyodik bakım · 250.000 km", subtitle: "Mercedes-Benz yetkili servis", ref: "34 HZN 614", ownerName: MANAGER, date: "2026-11-12", detail: "1.480 km kaldı", status: "Planlandı", amount: 14500 },
  { kind: "fleet.maintenance", title: "Periyodik bakım · 125.000 km", subtitle: "Ford Trucks yetkili servis", ref: "34 EAG 528", ownerName: MANAGER, date: "2026-11-22", detail: "640 km kaldı", status: "Planlandı", amount: 13800 },
  { kind: "fleet.maintenance", title: "Soğutucu ünite bakımı", subtitle: "Thermo King servis", ref: "34 HN 8416", ownerName: MANAGER, date: "2026-11-25", status: "Planlandı", amount: 6400 },
  { kind: "fleet.service", title: "Fren sistemi arızası", subtitle: "Servis kaydı · Onarım bekliyor", ref: "34 RLJ 165", ownerName: MANAGER, date: "2026-11-03", status: "Bakımda", amount: 12400 },
  { kind: "fleet.service", title: "Klima kompresörü değişimi", subtitle: "Parça değişimi · Garantili", ref: "34 EAG 528", ownerName: MANAGER, date: "2026-10-28", status: "Tamamlandı", amount: 6800 },
  { kind: "fleet.tyre", title: "Ön sağ · Michelin X Line", subtitle: "315/70 R22.5 · 6,2 mm diş derinliği", ref: "34 HZN 614", ownerName: MANAGER, detail: "82.400 km kullanım", status: "Uygun", amountLabel: "Değişim: 250.000 km" },
  { kind: "fleet.tyre", title: "Arka sol · Continental", subtitle: "315/70 R22.5 · 2,8 mm diş derinliği", ref: "34 DJE 399", ownerName: MANAGER, detail: "124.800 km kullanım", status: "Yenileme bekliyor", amountLabel: "Değişim öneriliyor" },
  { kind: "fleet.fuelFine", title: "Motorin alımı · 280 litre", subtitle: "Shell · Fiş: SH-40812 · WhatsApp'tan gelen fiş fotoğrafı", ref: "34 HZN 614", ownerName: "Galip Erdoğan", date: "2026-11-03", detail: "248.520 km", status: "Onaylandı", amount: 12880 },
  { kind: "fleet.fuelFine", title: "HGS geçiş bedeli", subtitle: "Kuzey Marmara Otoyolu", ref: "34 EAG 528", ownerName: "Mehmet Yıldız", date: "2026-11-02", status: "Onaylandı", amount: 1240 },
  { kind: "fleet.fuelFine", title: "Hız cezası", subtitle: "TEM Otoyolu · İtiraz süreci", ref: "34 DJE 399", ownerName: "Şerafettin Civelek", date: "2026-10-29", status: "İtiraz edildi", amount: 2167 },
  { kind: "people.timesheet", title: "Galip Erdoğan", subtitle: "Kasım 2026 · 3 sefer günü", ref: tenant.site, ownerName: MANAGER, detail: "3/22 çalışma günü", status: "Seferde", amountLabel: "0 gün izin" },
  { kind: "people.timesheet", title: "Yunus Özer", subtitle: "Yıllık izin · 10–14 Kasım", ref: tenant.site, ownerName: MANAGER, detail: "5 gün izin talebi", status: "Onay bekliyor", amountLabel: "12 gün bakiye" },
  { kind: "people.advance", title: "Galip Erdoğan · Sefer avansı", subtitle: "SFR-2026-0842", ref: "AVN-2026-042", ownerName: MANAGER, date: "2026-11-03", status: "Onaylandı", amount: 5000 },
  { kind: "people.advance", title: "Galip Erdoğan · Yemek fişi", subtitle: "WhatsApp'tan gelen fiş fotoğrafı · Müdür kaydetti", ref: "MSR-2026-129", ownerName: MANAGER, date: "2026-11-03", status: "Onay bekliyor", amount: 280 },
  { kind: "people.advance", title: "Şerafettin Civelek · Otopark fişi", subtitle: "WhatsApp'tan gelen fiş fotoğrafı · Müdür kaydetti", ref: "MSR-2026-128", ownerName: MANAGER, date: "2026-11-03", status: "Onay bekliyor", amount: 450 },
  { kind: "people.abroad", title: "Galip Erdoğan", subtitle: "2026 yılı · Schengen 90/180 gün", ref: "Almanya, Hollanda", ownerName: MANAGER, detail: "52 gün kullanıldı", status: "Uygun", amountLabel: "38 gün kaldı" },
  { kind: "people.abroad", title: "Şerafettin Civelek", subtitle: "2026 yılı · Schengen 90/180 gün", ref: "Bulgaristan, Romanya", ownerName: MANAGER, detail: "82 gün kullanıldı", status: "8 gün kaldı", amountLabel: "90 gün limit" },
  { kind: "customers.note", title: "Arçelik · Kasım kapasite planlaması", subtitle: "Aylık hacim 10 sefere çıkarılacak; 2. çekici ayrılacak.", ref: "MŞT-0012", ownerName: ADMIN, date: "2026-11-02", status: "Tamamlandı" },
  { kind: "customers.note", title: "Hayat Kimya · Sözleşme yenileme", subtitle: "2027 fiyat revizyonu görüşülecek.", ref: "MŞT-0008", ownerName: MANAGER, date: "2026-11-05", status: "Planlandı" },
  { kind: "invoices.erpExport", title: "Şişecam · Ekim 2026 fatura kalemleri", subtitle: "Excel dosyası · 4 sefer · 16 ek", ref: "AKT-2026-024", ownerName: MANAGER, date: "2026-11-01", detail: "01 Kas 2026, 14:32", status: "Tamamlandı", amount: 146000 },
  { kind: "invoices.erpExport", title: "Eylül 2026 fatura kalemleri", subtitle: "Excel dosyası · 26 sefer · 104 ek", ref: "AKT-2026-023", ownerName: MANAGER, date: "2026-10-02", detail: "02 Eki 2026, 11:05", status: "Tamamlandı", amount: 648500 },
  { kind: "tasks.template", title: "Yeni araç kaydı", subtitle: "5 görev · Belge toplama, kontrol, şoför ataması", ref: "Şablon · Filo", ownerName: MANAGER, detail: "Son kullanım: 28 Eki 2026", status: "Aktif" },
  { kind: "tasks.template", title: "Uluslararası sefer evrak seti", subtitle: "8 görev · CMR, TIR, geçiş, gümrük", ref: "Şablon · Operasyon", ownerName: ADMIN, detail: "Son kullanım: 02 Kas 2026", status: "Aktif" },
  { kind: "tasks.template", title: "Yeni çalışan işe alımı", subtitle: "6 görev · Özlük, SRC & ehliyet, araç zimmeti, WhatsApp grubu", ref: "Şablon · İK", ownerName: MANAGER, detail: "Son kullanım: 01 Eyl 2026", status: "Aktif" },
]

/* ------------------------------------------------------------------ */
/* Commercial                                                           */
/* ------------------------------------------------------------------ */

const quotes: Quote[] = [
  { id: "qte_082", number: "TKL-2026-082", customerId: "cus_arcelik", customerName: "Arçelik A.Ş.", from: "İstanbul", to: "Ankara", details: "24 ton · Tenteli · 10 sefer / ay", validUntil: "2026-11-10", status: "Onay bekliyor", price: 24500, ownerName: ADMIN },
  { id: "qte_081", number: "TKL-2026-081", customerName: "Migros Ticaret", from: "İstanbul", to: "Antalya", details: "12 ton · Frigo · 4 sefer / ay", validUntil: "2026-11-08", status: "Kabul edildi", price: 32000, ownerName: ADMIN },
  { id: "qte_080", number: "TKL-2026-080", customerName: "Vestel Elektronik", from: "Manisa", to: "İstanbul", details: "18 ton · Tenteli · Tek sefer", validUntil: "2026-11-05", status: "Taslak", price: 26500, ownerName: MANAGER },
].map((q) => ({ ...q, createdAt: ts("2026-10-28"), updatedAt: ts(T) })) as Quote[]

const tariffs: Tariff[] = [
  { id: "trf_012", code: "TRF-2026-012", customerName: "Arçelik A.Ş.", from: "İstanbul", to: "Ankara", vehicleType: "Tenteli", weightRange: "0–24 ton", validUntil: "2026-12-31", price: 24500, status: "Aktif", ownerName: ADMIN },
  { id: "trf_008", code: "TRF-2026-008", customerName: "Hayat Kimya", from: "Kocaeli", to: "İzmir", vehicleType: "Tenteli", weightRange: "0–24 ton", validUntil: "2026-12-31", price: 28000, status: "Aktif", ownerName: ADMIN },
  { id: "trf_015", code: "TRF-2026-015", customerName: "Ülker Bisküvi", from: "İstanbul", to: "Konya", vehicleType: "Frigo parsiyel", weightRange: "0–10 ton", validUntil: "2026-12-31", price: 22000, status: "Aktif", ownerName: ADMIN },
].map((t) => ({ ...t, createdAt: ts("2026-01-15"), updatedAt: ts(T) })) as Tariff[]

const invoices: InvoiceDraft[] = [
  { id: "inv_0124", number: "FTR-2026-0124", customerName: "Arçelik A.Ş.", period: "Ekim 2026", tripIds: [], tripCount: 8, documentCount: 32, amount: 196000, status: "Aktarıma hazır", date: T, ownerName: MANAGER },
  { id: "inv_0123", number: "FTR-2026-0123", customerName: "Hayat Kimya", period: "Ekim 2026", tripIds: [], tripCount: 6, documentCount: 24, amount: 168000, status: "Evrak bekliyor", date: T, ownerName: MANAGER },
  { id: "inv_0122", number: "FTR-2026-0122", customerName: "Şişecam", period: "Ekim 2026", tripIds: [], tripCount: 4, documentCount: 16, amount: 146000, status: "ERP’ye aktarıldı", date: "2026-11-01", ownerName: MANAGER },
].map((i) => ({ ...i, createdAt: ts(i.date), updatedAt: ts(T) })) as InvoiceDraft[]

const receivables: Receivable[] = [
  { id: "rcv_0118", invoiceNumber: "FTR-2026-0118", customerName: "Arçelik A.Ş.", title: "Arçelik A.Ş. · Eylül faturası", erpNumber: "ARC2026000482", dueDate: "2026-11-10", amount: 182000, collected: false, ownerName: MANAGER },
  { id: "rcv_0102", invoiceNumber: "FTR-2026-0102", customerName: "Şişecam", title: "Şişecam · Eylül faturası", erpNumber: "SIS2026000142", dueDate: "2026-10-31", amount: 131500, collected: false, ownerName: MANAGER },
].map((r) => ({ ...r, createdAt: ts("2026-10-01"), updatedAt: ts(T) })) as Receivable[]

const ledger: LedgerEntry[] = [
  { id: "led_031", number: "CR-2026-031", party: "Kaya Nakliyat", direction: "Alacak", amount: 48000, dueDate: "2026-11-01", createdAt: ts("2026-09-12"), description: "Ortak sefer navlun payı · Eylül", payments: [{ id: "pay_1", amount: 20000, date: "2026-10-05", note: "Havale" }], settled: false },
  { id: "led_034", number: "CR-2026-034", party: "Öz Akaryakıt Petrol", direction: "Borç", amount: 186500, dueDate: "2026-11-03", createdAt: ts("2026-10-01"), description: "Ekim ayı akaryakıt cari hesabı", payments: [{ id: "pay_2", amount: 60000, date: "2026-10-20", note: "Kısmi ödeme" }], settled: false },
  { id: "led_036", number: "CR-2026-036", party: "Demir Oto Servis", direction: "Borç", amount: 24800, dueDate: "2026-11-15", createdAt: ts("2026-10-28"), description: "34 RLJ 165 fren sistemi onarımı", payments: [], settled: false },
  { id: "led_029", number: "CR-2026-029", party: "Yıldırım Lojistik", direction: "Alacak", amount: 72500, dueDate: "2026-11-20", createdAt: ts("2026-10-10"), description: "Kiralanan çekici bedeli · 2 hafta", payments: [{ id: "pay_3", amount: 25000, date: "2026-10-18" }, { id: "pay_4", amount: 15000, date: "2026-10-30" }], settled: false },
  { id: "led_022", number: "CR-2026-022", party: "Kaya Nakliyat", direction: "Alacak", amount: 18000, dueDate: "2026-10-15", createdAt: ts("2026-08-30"), description: "Ağustos ortak sefer payı", payments: [{ id: "pay_5", amount: 18000, date: "2026-10-14" }], settled: true },
  { id: "led_038", number: "CR-2026-038", party: "Anadolu Lastik", direction: "Borç", amount: 64000, dueDate: "2026-12-05", createdAt: ts("2026-11-01"), description: "Kış lastiği · 8 adet (vadeli)", payments: [], settled: false },
].map((e) => ({ ...e, updatedAt: ts(T) })) as LedgerEntry[]

/* ------------------------------------------------------------------ */
/* Management                                                           */
/* ------------------------------------------------------------------ */

const tasks: Task[] = [
  { id: "tsk_1", title: "34 HZN 614 trafik sigortasını yenile", description: "", source: "Otomatik görev · Belge süre kuralı", relatedRef: "34 HZN 614", assigneeName: MANAGER, dueDate: T, dueTime: "17:00", priority: "Yüksek", status: "Bekliyor", checklist: [] },
  { id: "tsk_2", title: "SFR-2026-0838 POD belgesini topla", description: "Şoförden WhatsApp ile fotoğraf istenecek", relatedRef: "SFR-2026-0838", assigneeName: MANAGER, dueDate: T, dueTime: "14:00", priority: "Normal", status: "Devam ediyor", checklist: [] },
  { id: "tsk_3", title: "SFR-2026-0839 POD belgesini onayla", description: "WhatsApp'tan gelen fotoğraf dosyaya eklendi", relatedRef: "SFR-2026-0839", assigneeName: MANAGER, dueDate: T, dueTime: "16:00", priority: "Normal", status: "Onay bekliyor", checklist: [] },
  { id: "tsk_4", title: "34 RLJ 165 muayene randevusu al", description: "", source: "Otomatik görev · Belge süre kuralı", relatedRef: "34 RLJ 165", assigneeName: MANAGER, dueDate: "2026-11-02", priority: "Yüksek", status: "Bekliyor", checklist: [] },
  { id: "tsk_5", title: "Kasım fatura hazırlık dosyası · Arçelik", description: "Finans · Aylık kapanış", relatedRef: "FTR-2026-0124", assigneeName: ADMIN, dueDate: "2026-11-05", priority: "Normal", status: "Bekliyor", checklist: [] },
  { id: "tsk_6", title: "Kış lastiği değişimini planla · 5 yük aracı", description: "Filo · Sezonluk hazırlık", relatedRef: "Filo geneli", assigneeName: ADMIN, dueDate: "2026-11-15", priority: "Normal", status: "Planlandı", checklist: [] },
  { id: "tsk_7", title: "Galip Erdoğan SRC 4 yenileme eğitimi kaydı", description: "İK · Belge yenileme", relatedRef: "Galip Erdoğan", assigneeName: MANAGER, dueDate: "2026-11-10", priority: "Normal", status: "Devam ediyor", checklist: [] },
].map((t) => ({ ...t, createdAt: ts("2026-11-01"), updatedAt: ts(T) })) as Task[]

const claims: Claim[] = [
  { id: "clm_1", number: "HSR-2026-014", title: "Ambalaj hasarı · 3 palet", kind: "Yük hasarı", description: "WhatsApp'tan gelen fotoğraflı bildirim", relatedRef: "SFR-2026-0828", ownerName: MANAGER, slaDueAt: `${T}T16:00:00.000Z`, amount: 12500, status: "İncelemede", insuranceNumber: "SGR-2026-0042", source: "Panel" },
  { id: "clm_2", number: "HSR-2026-015", title: "Teslimat gecikmesi", kind: "Müşteri şikâyeti", description: "Müşteri şikâyeti · Hayat Kimya", relatedRef: "SFR-2026-0812", customerName: "Hayat Kimya", ownerName: ADMIN, slaDueAt: `${T}T20:00:00.000Z`, amount: 4200, status: "Yanıt bekliyor", source: "Portal" },
  { id: "clm_3", number: "HSR-2026-016", title: "Sağ arka çamurluk hasarı", kind: "Araç hasarı", description: "Araç hasarı · Sigorta dosyası", relatedRef: "34 RLJ 165", ownerName: MANAGER, slaDueAt: "2026-11-05T17:00:00.000Z", amount: 8750, status: "İncelemede", insuranceNumber: "SGR-2026-0047", source: "Panel" },
].map((c) => ({ ...c, createdAt: ts("2026-11-02"), updatedAt: ts(T) })) as Claim[]

const channels: Channel[] = [
  { id: "chn_ops", name: "Operasyon", kind: "channel", memberCount: 4 },
  { id: "chn_fleet", name: "Filo & bakım", kind: "channel", memberCount: 3 },
  { id: "chn_finance", name: "Finans", kind: "channel", memberCount: 3 },
  { id: "chn_quality", name: "Kalite", kind: "channel", memberCount: 2 },
  { id: "chn_general", name: "Genel", kind: "channel", memberCount: 6 },
  { id: "chn_announce", name: "Duyurular", kind: "announcements", memberCount: 6 },
  { id: "chn_handover", name: "Vardiya devir notları", kind: "handover", memberCount: 4 },
]

const messages: Message[] = [
  { id: "msg_1", channelId: "chn_ops", authorName: MANAGER, text: "SFR-2026-0842 Arçelik yüklemesi tamamlandı, araç Ankara yönünde ilerliyor. Tahmini varış 14:30.", createdAt: `${T}T09:20:00.000Z`, updatedAt: `${T}T09:20:00.000Z` },
  { id: "msg_2", channelId: "chn_ops", authorName: ADMIN, text: "Teşekkürler. Hayat Kimya yüklemesinde rampa yoğunluğu var mı? Müşteri 18:30 teslim istiyor.", createdAt: `${T}T09:42:00.000Z`, updatedAt: `${T}T09:42:00.000Z` },
  { id: "msg_3", channelId: "chn_ops", authorName: MANAGER, text: "Şerafettin rampada, 30 dk gecikme bekleniyor. Müşteriye bilgi verdim.", createdAt: `${T}T10:05:00.000Z`, updatedAt: `${T}T10:05:00.000Z` },
  { id: "msg_4", channelId: "chn_fleet", authorName: MANAGER, text: "34 RLJ 165 fren onarımı için Demir Oto Servis'ten randevu alındı. Muayene sonrası planlamaya açılacak.", createdAt: `${T}T08:30:00.000Z`, updatedAt: `${T}T08:30:00.000Z` },
  { id: "msg_5", channelId: "chn_announce", authorName: ADMIN, text: "Kış lastiği değişimleri 15 Kasım'a kadar tamamlanacak. Randevu saatleri WhatsApp grubundan paylaşılacak.", whatsapp: "sent", createdAt: `${T}T08:00:00.000Z`, updatedAt: `${T}T08:00:00.000Z` },
  { id: "msg_6", channelId: "chn_handover", authorName: MANAGER, text: "Akşam vardiyası: SFR-0841 yükleme gecikmeli, SFR-0838 POD bekleniyor. 34 RLJ 165 serviste.", createdAt: `${addDays(T, -1)}T18:10:00.000Z`, updatedAt: `${addDays(T, -1)}T18:10:00.000Z` },
]

const rules: AutomationRule[] = [
  { id: "rul_1", name: "Belge süresi yaklaşıyor", object: "Belge", condition: "Bitişine kalan gün", conditionText: "Bitişine ≤ 15 gün kaldığında", threshold: 15, action: "Görev oluştur & sorumluya bildir", enabled: true, library: true, lastRunAt: `${T}T08:00:00.000Z` },
  { id: "rul_2", name: "Teslim edildi, POD eksik", object: "Sefer", condition: "Durum değişikliği", conditionText: "Teslim edildi ve POD yok", threshold: 0, action: "Görev oluştur & sorumluya bildir", enabled: true, library: true, lastRunAt: `${T}T08:01:00.000Z` },
  { id: "rul_3", name: "Bakım kilometresi yaklaşıyor", object: "Araç", condition: "Kalan kilometre", conditionText: "Bakıma ≤ 1.000 km kaldığında", threshold: 1000, action: "Görev oluştur & sorumluya bildir", enabled: true, library: true, lastRunAt: `${T}T08:02:00.000Z` },
  { id: "rul_4", name: "Hasar SLA eşiği", object: "Hasar", condition: "Gecikme saati", conditionText: "İlk yanıt ≥ 20 saat beklediğinde", threshold: 20, action: "Yöneticiye eskalasyon", enabled: false, library: true, lastRunAt: `${T}T08:03:00.000Z` },
].map((r) => ({ ...r, createdAt: ts("2026-06-01"), updatedAt: ts(T) })) as AutomationRule[]

const ruleRuns: RuleRun[] = [
  { id: "run_1", ruleId: "rul_1", ruleName: "Belge süresi yaklaşıyor", ranAt: `${T}T08:00:00.000Z`, result: "2 belge eşik altında · 1 görev oluşturuldu.", status: "Başarılı", created: 1 },
  { id: "run_2", ruleId: "rul_2", ruleName: "Teslim edildi, POD eksik", ranAt: `${T}T08:01:00.000Z`, result: "SFR-2026-0838 için POD eksik · görev oluşturuldu.", status: "Başarılı", created: 1 },
  { id: "run_3", ruleId: "rul_3", ruleName: "Bakım kilometresi yaklaşıyor", ranAt: `${T}T08:02:00.000Z`, result: "Kontrol tamamlandı. Hata bulunmadı.", status: "Başarılı", created: 0 },
  { id: "run_4", ruleId: "rul_4", ruleName: "Hasar SLA eşiği", ranAt: `${T}T08:03:00.000Z`, result: "Kontrol tamamlandı. Hata bulunmadı.", status: "Başarılı", created: 0 },
]

const activities: Activity[] = [
  { id: "act_1", actorName: MANAGER, entityType: "trip", entityId: "trp_0842", entityLabel: "SFR-2026-0842", action: "status", summary: "Sefer durumu “Yolda” olarak güncellendi.", createdAt: `${T}T10:42:00.000Z` },
  { id: "act_2", actorName: MANAGER, entityType: "document", entityId: "doc_pod0839", entityLabel: "SFR-2026-0839 POD", action: "create", summary: "WhatsApp'tan gelen POD fotoğrafı dosyaya eklendi.", createdAt: `${T}T10:15:00.000Z` },
  { id: "act_3", actorName: ADMIN, entityType: "ledger", entityId: "led_034", entityLabel: "CR-2026-034", action: "payment", summary: "Öz Akaryakıt Petrol cari kaydına ₺60.000 ödeme girildi.", createdAt: `${addDays(T, -14)}T15:20:00.000Z` },
  { id: "act_4", actorName: "Sistem", entityType: "task", entityId: "tsk_1", entityLabel: "34 HZN 614 trafik sigortası", action: "create", summary: "Belge süre kuralı otomatik görev oluşturdu.", createdAt: `${T}T08:00:00.000Z` },
]

/* ------------------------------------------------------------------ */
/* Trend history (daily aggregates before the live trips)               */
/* ------------------------------------------------------------------ */

const history: TenantData["history"] = {
  daily: {
    "2026-10-28": { revenue: 41500, cost: 31200 },
    "2026-10-29": { revenue: 52000, cost: 39400 },
    "2026-10-30": { revenue: 46500, cost: 35100 },
    "2026-10-31": { revenue: 23000, cost: 17600 },
    "2026-11-01": { revenue: 0, cost: 0 },
  },
  weekly: [
    { label: "6–12 Eki", tooltipLabel: "1. hafta", revenue: 196500, cost: 148800 },
    { label: "13–19 Eki", tooltipLabel: "2. hafta", revenue: 214000, cost: 161300 },
    { label: "20–26 Eki", tooltipLabel: "3. hafta", revenue: 181500, cost: 137900 },
    { label: "27 Eki–2 Kas", tooltipLabel: "4. hafta", revenue: 181000, cost: 137200 },
  ],
}

/* ------------------------------------------------------------------ */

export function buildAlpCengiz(): TenantData {
  const roles = buildRoles(TENANT_ID)
  const role = (key: string) => roles.find((r) => r.key === key)!
  const users = [
    makeUser(TENANT_ID, role("owner"), { id: "usr_karaalp", name: ADMIN, email: "muhammet@alpcengizlojistik.com", title: "Şirket yöneticisi", department: "Yönetim", employeeId: "emp_karaalp" }),
    makeUser(TENANT_ID, role("manager"), { id: "usr_belit", name: MANAGER, email: "recep@alpcengizlojistik.com", title: "Operasyon müdürü", department: "Operasyon", employeeId: "emp_belit" }),
    makeUser(TENANT_ID, role("operations"), { id: "usr_ece", name: "Ece Yıldız", email: "ece@alpcengizlojistik.com", title: "Operasyon & finans uzmanı", department: "Operasyon" }),
    makeUser(TENANT_ID, role("fleet"), { id: "usr_selin", name: "Selin Aksoy", email: "selin@alpcengizlojistik.com", title: "Filo & belge sorumlusu", department: "Operasyon" }),
    makeUser(TENANT_ID, role("finance"), { id: "usr_kerem", name: "Kerem Aydın", email: "kerem@alpcengizlojistik.com", title: "Muhasebe", department: "Yönetim" }),
    makeUser(TENANT_ID, role("readonly"), { id: "usr_zeynep", name: "Zeynep Kaya", email: "zeynep@alpcengizlojistik.com", title: "Stajyer", department: "Operasyon" }),
    makeUser(TENANT_ID, role("external"), { id: "usr_ayse", name: "Ayşe Güner", email: "ayse.guner@arcelik.com.tr", title: "Lojistik uzmanı", kind: "external", customerId: "cus_arcelik", customerName: "Arçelik A.Ş." }),
  ]
  return {
    users,
    roles,
    customers,
    trips: tripSeeds.map(buildTrip),
    loads,
    vehicles,
    employees,
    documents: buildDocuments(),
    quotas,
    expenses: buildVehicleExpenses(),
    records: recordSeeds.map((r, i) => ({ ...r, id: `rec_${i + 1}`, createdAt: ts("2026-10-15"), updatedAt: ts(T) })),
    quotes,
    tariffs,
    invoices,
    receivables,
    ledger,
    tasks,
    claims,
    channels,
    messages,
    savedReports: [],
    scheduledReports: [],
    rules,
    ruleRuns,
    notifications: [
      { id: "ntf_l1", title: "Cari vadesi geldi · Kaya Nakliyat", text: "Tahsil edilecek ₺28.000 · 01.11.2026", href: "/ledger", tone: "orange", icon: "wallet", createdAt: `${T}T09:48:00.000Z`, readBy: [] },
      { id: "ntf_l2", title: "Cari vadesi geldi · Öz Akaryakıt Petrol", text: "Ödenecek ₺126.500 · 03.11.2026", href: "/ledger", tone: "orange", icon: "wallet", createdAt: `${T}T09:48:00.000Z`, readBy: [] },
      { id: "ntf_1", title: "Trafik sigortası yenilenmeli", text: "34 HZN 614 · Son 5 gün", href: "/documents", tone: "orange", icon: "shield", createdAt: `${T}T09:48:00.000Z`, readBy: [] },
      { id: "ntf_2", title: "POD fotoğrafı dosyaya eklendi", text: "SFR-2026-0839 · Yunus Özer WhatsApp'tan gönderdi", href: "/operations/trp_0839", tone: "green", icon: "file", createdAt: `${T}T09:48:00.000Z`, readBy: [] },
      { id: "ntf_3", title: "Planlanan bakım yaklaşıyor", text: "34 DJE 399 · 720 km kaldı", href: "/fleet", tone: "blue", icon: "truck", createdAt: `${T}T09:48:00.000Z`, readBy: [] },
    ],
    activities,
    comments: [
      { id: "cmt_1", entityType: "trip", entityId: "trp_0842", authorName: MANAGER, text: "Yükleme tamamlandı. Araç Ankara yönünde ilerliyor.", internal: true, createdAt: `${T}T09:20:00.000Z` },
    ],
    history,
    sequences: { trip: 842, quote: 82, ledger: 38, invoice: 124, claim: 16, record: 0, document: 0 },
  }
}
