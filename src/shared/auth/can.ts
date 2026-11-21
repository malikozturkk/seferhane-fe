/**
 * Single authorization function used by the API (enforcement), server pages
 * and client UI (hiding/disabling). Effective access = role grants the
 * permission AND the tenant's package includes the resource.
 */
import { isResourceEntitled, type Entitlements } from "./entitlements"
import type { Action, Permission, PlatformPermission, Resource } from "./permissions"

export interface AccessSubject {
  permissions: readonly (Permission | PlatformPermission)[]
  entitlements?: Entitlements | null
}

export function can(subject: AccessSubject | null | undefined, permission: Permission | PlatformPermission): boolean {
  if (!subject) return false
  if (!subject.permissions.includes(permission)) return false
  if (permission.startsWith("platform:") || permission.startsWith("partner:")) return true
  const resource = permission.split(":")[0] as Resource
  return subject.entitlements ? isResourceEntitled(subject.entitlements, resource) : true
}

export const canDo = (subject: AccessSubject | null | undefined, resource: Resource, action: Action) =>
  can(subject, `${resource}:${action}` as Permission)

/** Why a resource is unavailable: role or package. Used for friendly UI states. */
export function accessReason(
  subject: AccessSubject | null | undefined,
  resource: Resource,
): "ok" | "role" | "package" {
  if (!subject) return "role"
  if (subject.entitlements && !isResourceEntitled(subject.entitlements, resource)) return "package"
  return subject.permissions.includes(`${resource}:view` as Permission) ? "ok" : "role"
}
