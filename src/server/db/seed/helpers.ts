import { SYSTEM_ROLES } from "@/shared/auth/roles"
import type { Role } from "@/shared/contracts/tenancy"
import type { UserRecord } from "../types"

/** Demo password for every seeded account. */
export const DEMO_PASSWORD = "demo1234"

export const stamp = (date: string) => `${date.slice(0, 10)}T08:00:00.000Z`

/** Each tenant gets its own copy of the system role templates. */
export function buildRoles(tenantId: string): Role[] {
  return SYSTEM_ROLES.map((r) => ({
    id: `${tenantId}_role_${r.key}`,
    tenantId,
    key: r.key,
    name: r.name,
    description: r.description,
    scope: r.scope,
    permissions: [...r.permissions],
    system: true,
    createdAt: stamp("2026-01-01"),
    updatedAt: stamp("2026-01-01"),
  }))
}

export function makeUser(
  tenantId: string | null,
  role: Role,
  user: Partial<UserRecord> & Pick<UserRecord, "id" | "name" | "email" | "title">,
): UserRecord {
  return {
    tenantId,
    kind: "internal",
    roleId: role.id,
    roleName: role.name,
    status: "Aktif",
    password: DEMO_PASSWORD,
    createdAt: stamp("2026-01-05"),
    updatedAt: stamp("2026-01-05"),
    ...user,
  }
}
