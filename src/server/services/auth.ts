import "server-only"
import type { Me, Role, Tenant } from "@/shared/contracts/tenancy"
import type { TenantData, UserRecord } from "../db/types"
import { navBadges } from "./derive"

export function buildMe(user: UserRecord, role: Role, tenant: Tenant | null, data: TenantData | null): Me {
  return {
    user: {
      id: user.id,
      name: user.name,
      firstName: user.name.split(" ")[0],
      email: user.email,
      kind: user.kind,
      title: user.title,
      customerId: user.customerId,
      customerName: user.customerName,
      partnerId: user.partnerId,
    },
    role: { id: role.id, name: role.name, scope: role.scope },
    permissions: role.permissions,
    tenant: tenant
      ? { id: tenant.id, slug: tenant.slug, name: tenant.name, legalName: tenant.legalName, plan: tenant.plan, addons: tenant.addons, status: tenant.status }
      : null,
    badges: data && user.kind === "internal" ? navBadges(data, user.name) : {},
  }
}

/** Strip the password before returning a user. */
export const publicUser = ({ password: _password, ...user }: UserRecord) => {
  void _password
  return user
}
