import { z } from "zod"
import type { PackageKey, PlanKey } from "../auth/entitlements"
import type { Permission, PlatformPermission } from "../auth/permissions"
import type { RoleScope } from "../auth/roles"
import type { Entity } from "./common"

/* ------------------------------------------------------------------ */
/* Tenant                                                              */
/* ------------------------------------------------------------------ */

export interface TenantSettings {
  notifications: Record<string, boolean>
  templates: Record<string, boolean>
}

export interface Tenant extends Entity {
  slug: string
  name: string
  legalName: string
  taxOffice: string
  taxNumber: string
  address: string
  phone: string
  email: string
  site: string
  departments: string[]
  plan: PlanKey
  addons: PackageKey[]
  status: "Aktif" | "Deneme" | "Askıda"
  partnerId?: string
  storageUsedGb: number
  settings: TenantSettings
}

/** Public tenant info (login page, branding). */
export interface TenantPublic {
  slug: string
  name: string
  status: Tenant["status"]
}

export const tenantProfileSchema = z.object({
  legalName: z.string().trim().min(2, "Şirket unvanı zorunludur"),
  taxOffice: z.string().trim().optional().default(""),
  taxNumber: z
    .string()
    .trim()
    .regex(/^[0-9 ]*$/, "Vergi numarası yalnızca rakam içerebilir")
    .optional()
    .default(""),
  address: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  email: z.union([z.literal(""), z.email("Geçerli bir e-posta girin")]).optional().default(""),
})
export type TenantProfileInput = z.input<typeof tenantProfileSchema>

export const tenantPreferencesSchema = z.object({
  notifications: z.record(z.string(), z.boolean()).optional(),
  templates: z.record(z.string(), z.boolean()).optional(),
})

/* ------------------------------------------------------------------ */
/* Roles & users                                                        */
/* ------------------------------------------------------------------ */

export interface Role extends Entity {
  tenantId: string | null
  key: string
  name: string
  description: string
  scope: RoleScope
  permissions: Permission[]
  /** System templates cannot be edited, only cloned. */
  system: boolean
}

export const roleInputSchema = z.object({
  name: z.string().trim().min(2, "Rol adı zorunludur").max(40),
  description: z.string().trim().max(200).optional().default(""),
  permissions: z.array(z.string()).min(1, "En az bir yetki seçin"),
})
export type RoleInput = z.input<typeof roleInputSchema>

export type UserKind = "internal" | "external" | "platform" | "partner"
export type UserStatus = "Aktif" | "Davet edildi" | "Pasif"

export interface User extends Entity {
  tenantId: string | null
  name: string
  email: string
  kind: UserKind
  roleId: string
  roleName: string
  title: string
  department?: string
  /** External users are bound to one customer (portal scope). */
  customerId?: string
  customerName?: string
  partnerId?: string
  employeeId?: string
  status: UserStatus
  lastLoginAt?: string
}

export const inviteUserSchema = z.object({
  email: z.email("Geçerli bir e-posta girin"),
  name: z.string().trim().optional().default(""),
  roleId: z.string().min(1, "Rol seçin"),
  customerId: z.string().optional(),
})
export type InviteUserInput = z.input<typeof inviteUserSchema>

export const updateUserSchema = z.object({
  roleId: z.string().optional(),
  status: z.enum(["Aktif", "Pasif"]).optional(),
})

/* ------------------------------------------------------------------ */
/* Partners (platform level — referral / business partners, plan §11)  */
/* ------------------------------------------------------------------ */

export const PARTNER_TYPES = ["Sigorta acentesi", "Filo kiralama", "Mali müşavir", "Sektör derneği", "Danışman"] as const

export interface Partner extends Entity {
  name: string
  type: (typeof PARTNER_TYPES)[number]
  contactName: string
  email: string
  phone: string
  /** Referral commission, e.g. 0.1 = %10 */
  commissionRate: number
  status: "Aktif" | "Pasif"
}

export const partnerInputSchema = z.object({
  name: z.string().trim().min(2, "Partner adı zorunludur"),
  type: z.enum(PARTNER_TYPES),
  contactName: z.string().trim().min(2, "Yetkili adı zorunludur"),
  email: z.email("Geçerli bir e-posta girin"),
  phone: z.string().trim().optional().default(""),
  commissionRate: z.coerce.number().min(0).max(50).default(10),
})
export type PartnerInput = z.input<typeof partnerInputSchema>

export const tenantCreateSchema = z.object({
  name: z.string().trim().min(2, "Firma adı zorunludur"),
  legalName: z.string().trim().min(2, "Unvan zorunludur"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/, "Yalnızca küçük harf, rakam ve tire (3–32 karakter)"),
  plan: z.enum(["starter", "professional", "enterprise"]),
  addons: z.array(z.enum(["core", "commercial", "compliance", "external", "analytics"])).default([]),
  partnerId: z.string().optional(),
  ownerName: z.string().trim().min(2, "Yönetici adı zorunludur"),
  ownerEmail: z.email("Geçerli bir e-posta girin"),
})
export type TenantCreateInput = z.input<typeof tenantCreateSchema>

export const tenantUpdateSchema = z.object({
  plan: z.enum(["starter", "professional", "enterprise"]).optional(),
  addons: z.array(z.enum(["core", "commercial", "compliance", "external", "analytics"])).optional(),
  status: z.enum(["Aktif", "Deneme", "Askıda"]).optional(),
  partnerId: z.string().nullable().optional(),
})

/* ------------------------------------------------------------------ */
/* Session                                                              */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre zorunludur"),
})
export type LoginInput = z.infer<typeof loginSchema>

/** `GET /me` — everything the client needs to render & gate the UI. */
export interface Me {
  user: Pick<User, "id" | "name" | "email" | "kind" | "title" | "customerId" | "customerName" | "partnerId"> & {
    firstName: string
  }
  role: Pick<Role, "id" | "name" | "scope">
  permissions: Array<Permission | PlatformPermission>
  tenant: Pick<Tenant, "id" | "slug" | "name" | "legalName" | "plan" | "addons" | "status"> | null
  /** Sidebar badges (open tasks, document alerts, due ledger entries). */
  badges: Record<string, number>
}

export interface DemoAccount {
  email: string
  name: string
  roleName: string
  kind: UserKind
}
