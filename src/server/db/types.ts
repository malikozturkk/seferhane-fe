import type { Activity, Comment } from "@/shared/contracts/common"
import type {
  Customer,
  InvoiceDraft,
  LedgerEntry,
  Quote,
  Receivable,
  Tariff,
} from "@/shared/contracts/commercial"
import type {
  AutomationRule,
  Channel,
  Claim,
  Message,
  Notification,
  RuleRun,
  SavedReport,
  Task,
} from "@/shared/contracts/management"
import type { Load, Trip } from "@/shared/contracts/operations"
import type {
  ComplianceDocument,
  Employee,
  PermitQuota,
  Vehicle,
  VehicleExpense,
  WorkRecord,
} from "@/shared/contracts/resources"
import type { Partner, Role, Tenant, User } from "@/shared/contracts/tenancy"

/** Stored user — the password never leaves the server. */
export interface UserRecord extends User {
  password: string
}

export interface StoredNotification extends Omit<Notification, "read"> {
  readBy: string[]
}

/** Every collection that belongs to exactly one tenant (plan §10: tenant_id on every table). */
export interface TenantData {
  users: UserRecord[]
  roles: Role[]
  customers: Customer[]
  trips: Trip[]
  loads: Load[]
  vehicles: Vehicle[]
  employees: Employee[]
  documents: ComplianceDocument[]
  quotas: PermitQuota[]
  expenses: VehicleExpense[]
  records: WorkRecord[]
  quotes: Quote[]
  tariffs: Tariff[]
  invoices: InvoiceDraft[]
  receivables: Receivable[]
  ledger: LedgerEntry[]
  tasks: Task[]
  claims: Claim[]
  channels: Channel[]
  messages: Message[]
  savedReports: SavedReport[]
  scheduledReports: string[]
  rules: AutomationRule[]
  ruleRuns: RuleRun[]
  notifications: StoredNotification[]
  activities: Activity[]
  comments: Comment[]
  /** Historical daily revenue/cost aggregates used for trend charts. */
  history: { daily: Record<string, { revenue: number; cost: number }>; weekly: Array<{ label: string; tooltipLabel: string; revenue: number; cost: number }> }
  /** Running counters for human readable numbers (SFR-2026-0843…). */
  sequences: Record<string, number>
}

export interface MagicLink {
  token: string
  tenantId: string
  purpose: "document_upload" | "quote_approval"
  targetId: string
  expiresAt: string
  usedAt?: string
}

export interface Database {
  tenants: Tenant[]
  partners: Partner[]
  /** Platform & partner users (tenantId = null). */
  platformUsers: UserRecord[]
  platformRoles: Role[]
  magicLinks: MagicLink[]
  data: Record<string, TenantData>
}
