/**
 * Commercial packaging (Ürün planı §8): one core package + four add-ons,
 * three tiers with capacity limits. Entitlements decide which modules a
 * tenant has bought; roles decide what a user may do inside them.
 */
import type { Resource } from "./permissions"

export const PACKAGES = ["core", "commercial", "compliance", "external", "analytics"] as const
export type PackageKey = (typeof PACKAGES)[number]

export const PACKAGE_INFO: Record<PackageKey, { name: string; description: string; addonPrice?: number }> = {
  core: {
    name: "Operasyon (çekirdek)",
    description: "Dashboard, planlama, operasyon dosyaları, sefer kapanışı, belge, görev, filo & çalışan temel, cari, hasar temel, raporlar, ayarlar",
  },
  commercial: {
    name: "Ticari",
    description: "Müşteri & teklif, Maliyet & kârlılık tam, Fatura hazırlığı & tahsilat",
    addonPrice: 2500,
  },
  compliance: {
    name: "Uyum",
    description: "Kalite & denetim, Filo tam (lastik, yakıt, ceza), Çalışanlar & İK tam, Hasar Pro",
    addonPrice: 2000,
  },
  external: {
    name: "Dış dünya",
    description: "Müşteri portalı, İletişim & duyurular, müşteri hizmet raporu",
    addonPrice: 3000,
  },
  analytics: {
    name: "Analitik & otomasyon",
    description: "Gelişmiş raporlar, Otomasyon tasarlayıcı, tahminler",
    addonPrice: 2500,
  },
}

export const PLANS = ["starter", "professional", "enterprise"] as const
export type PlanKey = (typeof PLANS)[number]

export interface PlanInfo {
  name: string
  packages: PackageKey[]
  maxVehicles: number | null
  maxOfficeUsers: number | null
  storageGb: number
  monthlyPrice: number | null
  monthlyPriceMonthly: number | null
}

export const PLAN_INFO: Record<PlanKey, PlanInfo> = {
  starter: {
    name: "Başlangıç",
    packages: ["core"],
    maxVehicles: 20,
    maxOfficeUsers: 3,
    storageGb: 20,
    monthlyPrice: 4000,
    monthlyPriceMonthly: 4800,
  },
  professional: {
    name: "Profesyonel",
    packages: ["core", "commercial", "compliance"],
    maxVehicles: 80,
    maxOfficeUsers: 15,
    storageGb: 200,
    monthlyPrice: 12000,
    monthlyPriceMonthly: 14400,
  },
  enterprise: {
    name: "Kurumsal",
    packages: [...PACKAGES],
    maxVehicles: null,
    maxOfficeUsers: null,
    storageGb: 1024,
    monthlyPrice: 28000,
    monthlyPriceMonthly: null,
  },
}

/** Which package unlocks a resource. Resources not listed are always available (core). */
export const RESOURCE_PACKAGE: Partial<Record<Resource, PackageKey>> = {
  quality: "compliance",
  quotes: "commercial",
  costs: "commercial",
  invoices: "commercial",
  messages: "external",
  portal: "external",
  automation: "analytics",
}

/** Tabs inside core modules that belong to an add-on (Faz 2 features). */
export const TAB_PACKAGE: Record<string, PackageKey> = {
  "Geçiş belgesi kotaları": "compliance",
  Lastikler: "compliance",
  "Yakıt & cezalar": "compliance",
  "Puantaj & izin": "compliance",
  "Avans & masraf": "compliance",
  Performans: "compliance",
  "Yurt dışı günleri": "compliance",
  Teklifler: "commercial",
  Tarifeler: "commercial",
}

export interface Entitlements {
  plan: PlanKey
  addons: PackageKey[]
}

export function activePackages({ plan, addons }: Entitlements): PackageKey[] {
  return Array.from(new Set([...PLAN_INFO[plan].packages, ...addons]))
}

export function hasPackage(ent: Entitlements, pkg: PackageKey | undefined): boolean {
  return !pkg || activePackages(ent).includes(pkg)
}

export const isResourceEntitled = (ent: Entitlements, resource: Resource) =>
  hasPackage(ent, RESOURCE_PACKAGE[resource])

export const isTabEntitled = (ent: Entitlements, tab: string) => hasPackage(ent, TAB_PACKAGE[tab])
