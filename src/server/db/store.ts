import "server-only"
import { PLATFORM_PERMISSIONS } from "@/shared/auth/permissions"
import type { Partner, Role } from "@/shared/contracts/tenancy"
import type { Database, TenantData } from "./types"
import { buildAlpCengiz, tenant as alpCengiz } from "./seed/alpcengiz"
import { makeUser, stamp } from "./seed/helpers"
import { buildKaradeniz, tenant as karadeniz } from "./seed/karadeniz"

function seed(): Database {
  const platformRoles: Role[] = [
    {
      id: "prole_admin",
      tenantId: null,
      key: "platform_admin",
      name: "Platform yöneticisi",
      description: "Tüm tenant, paket ve partner yönetimi.",
      scope: "all",
      permissions: [...PLATFORM_PERMISSIONS] as never,
      system: true,
      createdAt: stamp("2026-01-01"),
      updatedAt: stamp("2026-01-01"),
    },
    {
      id: "prole_partner",
      tenantId: null,
      key: "partner",
      name: "İş ortağı",
      description: "Yönlendirdiği firmaları ve komisyon özetini görür.",
      scope: "all",
      permissions: ["partner:portfolio"] as never,
      system: true,
      createdAt: stamp("2026-01-01"),
      updatedAt: stamp("2026-01-01"),
    },
  ]
  const partners: Partner[] = [
    { id: "prt_guven", name: "Güven Sigorta Acenteliği", type: "Sigorta acentesi", contactName: "Oya Demir", email: "oya@guvensigorta.com", phone: "+90 216 555 10 20", commissionRate: 0.1, status: "Aktif", createdAt: stamp("2026-02-01"), updatedAt: stamp("2026-02-01") },
    { id: "prt_anadolu", name: "Anadolu Filo Kiralama", type: "Filo kiralama", contactName: "Murat Şahin", email: "murat@anadolufilo.com", phone: "+90 312 444 20 30", commissionRate: 0.1, status: "Aktif", createdAt: stamp("2026-03-12"), updatedAt: stamp("2026-03-12") },
    { id: "prt_demir", name: "Demir Mali Müşavirlik", type: "Mali müşavir", contactName: "Selim Demir", email: "selim@demirsmmm.com", phone: "+90 232 333 40 50", commissionRate: 0.08, status: "Aktif", createdAt: stamp("2026-05-03"), updatedAt: stamp("2026-05-03") },
  ]
  const [adminRole, partnerRole] = platformRoles
  return {
    tenants: [alpCengiz, karadeniz],
    partners,
    platformRoles,
    platformUsers: [
      makeUser(null, adminRole, { id: "usr_platform", name: "Seferhane Destek", email: "admin@seferhane.com", title: "Platform yöneticisi", kind: "platform" }),
      makeUser(null, partnerRole, { id: "usr_partner_oya", name: "Oya Demir", email: "oya@guvensigorta.com", title: "Güven Sigorta · İş ortağı", kind: "partner", partnerId: "prt_guven" }),
    ],
    magicLinks: [
      { token: "demo-belge-0838", tenantId: alpCengiz.id, purpose: "document_upload", targetId: "trp_0838", expiresAt: "2026-11-10" },
      { token: "demo-teklif-082", tenantId: alpCengiz.id, purpose: "quote_approval", targetId: "qte_082", expiresAt: "2026-11-10" },
    ],
    data: {
      [alpCengiz.id]: buildAlpCengiz(),
      [karadeniz.id]: buildKaradeniz(),
    },
  }
}

/**
 * In-memory database. Kept on `globalThis` so it survives dev hot reloads;
 * resets to the seed when the server restarts.
 */
const g = globalThis as typeof globalThis & { __seferhaneDb?: Database }
export const db: Database = (g.__seferhaneDb ??= seed())

export function emptyTenantData(): TenantData {
  return {
    users: [], roles: [], customers: [], trips: [], loads: [], vehicles: [], employees: [], documents: [], quotas: [],
    expenses: [], records: [], quotes: [], tariffs: [], invoices: [], receivables: [], ledger: [], tasks: [], claims: [],
    channels: [
      { id: "chn_ops", name: "Operasyon", kind: "channel", memberCount: 1 },
      { id: "chn_announce", name: "Duyurular", kind: "announcements", memberCount: 1 },
      { id: "chn_handover", name: "Vardiya devir notları", kind: "handover", memberCount: 1 },
    ],
    messages: [], savedReports: [], scheduledReports: [], rules: [], ruleRuns: [], notifications: [], activities: [],
    comments: [], history: { daily: {}, weekly: [] },
    sequences: { trip: 0, quote: 0, ledger: 0, invoice: 0, claim: 0, record: 0, document: 0 },
  }
}
