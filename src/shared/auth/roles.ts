/**
 * System role templates (Ürün planı §5.18). Tenants start with these and may
 * clone/edit them into custom roles. Drivers are NOT users.
 */
import { ALL_PERMISSIONS, grant, type Permission, type Resource } from "./permissions"

export type RoleScope = "all" | "customer"

export interface RoleTemplate {
  key: string
  name: string
  description: string
  scope: RoleScope
  permissions: Permission[]
}

const INTERNAL: Resource[] = [
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
]

const ADMIN_ONLY: Resource[] = ["users", "roles", "billing"]

export const SYSTEM_ROLES: RoleTemplate[] = [
  {
    key: "owner",
    name: "Şirket yöneticisi",
    description: "Tüm modüller, kullanıcı, rol ve paket yönetimi.",
    scope: "all",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "manager",
    name: "Müdür",
    description: "Operasyon, filo, belge, çalışan ve finans kayıtlarında tam yetki. Paket ve kullanıcı yönetimi kapalı.",
    scope: "all",
    permissions: [...grant(INTERNAL), ...grant(["settings", "audit"]), ...grant(["users", "roles"], ["view"])],
  },
  {
    key: "operations",
    name: "Operasyon",
    description: "Sefer, belge, görev, hasar ve iletişim kayıtlarını yönetir.",
    scope: "all",
    permissions: [
      ...grant(["dashboard", "planning", "trips", "tasks", "claims", "messages"]),
      ...grant(["documents"], ["view", "create", "update", "export"]),
      ...grant(["fleet", "people", "customers", "vehicleCosts"], ["view"]),
      ...grant(["reports"], ["view", "export"]),
    ],
  },
  {
    key: "planner",
    name: "Planlama",
    description: "Sefer planlama tahtası ve operasyon dosyaları.",
    scope: "all",
    permissions: [
      ...grant(["dashboard", "planning"]),
      ...grant(["trips"], ["view", "create", "update"]),
      ...grant(["fleet", "people", "documents", "customers"], ["view"]),
      ...grant(["tasks"], ["view", "create", "update"]),
    ],
  },
  {
    key: "fleet",
    name: "Filo",
    description: "Araç, bakım, masraf ve araç belgeleri.",
    scope: "all",
    permissions: [
      ...grant(["dashboard", "fleet", "vehicleCosts", "documents", "tasks"]),
      ...grant(["planning", "trips", "people", "claims"], ["view"]),
    ],
  },
  {
    key: "quality",
    name: "Kalite",
    description: "Denetim, uygunsuzluk, DÖF, eğitim ve belge uyumu.",
    scope: "all",
    permissions: [
      ...grant(["dashboard", "quality", "documents", "tasks"]),
      ...grant(["fleet", "people", "claims", "trips"], ["view"]),
    ],
  },
  {
    key: "sales",
    name: "Satış",
    description: "Müşteri kartları, teklif ve tarifeler.",
    scope: "all",
    permissions: [
      ...grant(["dashboard", "customers", "quotes"]),
      ...grant(["trips"], ["view", "create"]),
      ...grant(["costs"], ["view"]),
      ...grant(["reports"], ["view", "export"]),
    ],
  },
  {
    key: "finance",
    name: "Finans",
    description: "Maliyet, fatura hazırlığı, tahsilat ve cari hesaplar.",
    scope: "all",
    permissions: [
      ...grant(["dashboard", "costs", "invoices", "ledger", "vehicleCosts"]),
      ...grant(["trips", "customers", "fleet"], ["view"]),
      ...grant(["reports"], ["view", "create", "export"]),
    ],
  },
  {
    key: "hr",
    name: "İK",
    description: "Çalışan kayıtları, puantaj, izin ve avanslar.",
    scope: "all",
    permissions: [
      ...grant(["dashboard", "people", "tasks"]),
      ...grant(["documents"], ["view", "create"]),
      ...grant(["fleet"], ["view"]),
    ],
  },
  {
    key: "readonly",
    name: "Salt okunur",
    description: "İç modülleri yalnızca görüntüler.",
    scope: "all",
    permissions: grant(INTERNAL, ["view"]),
  },
  {
    key: "external",
    name: "Dış kullanıcı",
    description: "Yalnızca ilişkili müşterinin seferlerini, belgelerini ve tekliflerini görür. İç yorumlar gizlidir.",
    scope: "customer",
    permissions: grant(["portal"]),
  },
]

export const OWNER_ONLY_RESOURCES = ADMIN_ONLY
