/**
 * Permission model: "<resource>:<action>".
 * Resources map 1:1 to protected areas; actions are a fixed vocabulary.
 * This file is shared by the client (UI gating) and the server (enforcement)
 * and is meant to move to the backend unchanged.
 */

export const RESOURCES = [
  "dashboard",
  "planning",
  "trips",
  "documents",
  "quality",
  "fleet",
  "vehicleCosts",
  "people",
  "customers",
  "quotes",
  "costs",
  "invoices",
  "ledger",
  "tasks",
  "claims",
  "messages",
  "reports",
  "automation",
  "portal",
  "settings",
  "users",
  "roles",
  "audit",
  "billing",
] as const
export type Resource = (typeof RESOURCES)[number]

export const ACTIONS = ["view", "create", "update", "delete", "approve", "export", "manage"] as const
export type Action = (typeof ACTIONS)[number]

export type Permission = `${Resource}:${Action}`

/** Platform-level (admin.seferhane.com) permissions. */
export const PLATFORM_PERMISSIONS = [
  "platform:tenants",
  "platform:partners",
  "platform:plans",
  "partner:portfolio",
] as const
export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number]

export const RESOURCE_LABELS: Record<Resource, string> = {
  dashboard: "Genel bakış",
  planning: "Sefer planlama",
  trips: "Operasyon dosyaları",
  documents: "Belge & uyum",
  quality: "Kalite & denetim",
  fleet: "Filo & bakım",
  vehicleCosts: "Araç maliyetleri",
  people: "Çalışanlar & İK",
  customers: "Müşteri kartları",
  quotes: "Teklif & tarife",
  costs: "Maliyet & kârlılık",
  invoices: "Fatura & tahsilat",
  ledger: "Cari hesaplar",
  tasks: "Görev & iş akışı",
  claims: "Hasar & şikâyet",
  messages: "İletişim & duyurular",
  reports: "Raporlar & analitik",
  automation: "Otomasyon",
  portal: "Müşteri portalı",
  settings: "Şirket ayarları",
  users: "Kullanıcılar",
  roles: "Roller & yetkiler",
  audit: "Denetim izi",
  billing: "Paket & kullanım",
}

export const ACTION_LABELS: Record<Action, string> = {
  view: "Görüntüle",
  create: "Oluştur",
  update: "Düzenle",
  delete: "Sil / arşivle",
  approve: "Onayla",
  export: "Dışa aktar",
  manage: "Yönet",
}

/** Actions that make sense per resource (drives the role editor matrix). */
export const RESOURCE_ACTIONS: Record<Resource, Action[]> = {
  dashboard: ["view"],
  planning: ["view", "create", "update"],
  trips: ["view", "create", "update", "approve", "export"],
  documents: ["view", "create", "update", "delete", "approve", "export"],
  quality: ["view", "create", "update", "approve", "export"],
  fleet: ["view", "create", "update", "export"],
  vehicleCosts: ["view", "create", "export"],
  people: ["view", "create", "update", "export"],
  customers: ["view", "create", "update", "export"],
  quotes: ["view", "create", "update", "approve"],
  costs: ["view", "export"],
  invoices: ["view", "create", "approve", "export"],
  ledger: ["view", "create", "update", "export"],
  tasks: ["view", "create", "update", "approve"],
  claims: ["view", "create", "update", "approve", "export"],
  messages: ["view", "create"],
  reports: ["view", "create", "export"],
  automation: ["view", "create", "update"],
  portal: ["view", "create", "approve"],
  settings: ["view", "update"],
  users: ["view", "create", "update"],
  roles: ["view", "manage"],
  audit: ["view", "export"],
  billing: ["view", "manage"],
}

export const perm = (resource: Resource, action: Action): Permission => `${resource}:${action}`

/** All permissions for the given resources (optionally limited to some actions). */
export function grant(resources: readonly Resource[], actions?: readonly Action[]): Permission[] {
  return resources.flatMap((r) =>
    RESOURCE_ACTIONS[r].filter((a) => !actions || actions.includes(a)).map((a) => perm(r, a)),
  )
}

export const ALL_PERMISSIONS: Permission[] = grant(RESOURCES)
