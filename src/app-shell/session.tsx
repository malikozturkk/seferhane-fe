"use client"

import { useQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { accessReason, can, canDo } from "@/shared/auth/can"
import type { Action, Permission, PlatformPermission, Resource } from "@/shared/auth/permissions"
import { isTabEntitled } from "@/shared/auth/entitlements"
import { http } from "@/shared/api/http"
import type { Me } from "@/shared/contracts/tenancy"

/** Current session. 401 → `data` undefined + `error`. */
export function useMe() {
  return useQuery<Me, Error>({
    queryKey: ["me"],
    queryFn: () => http.get<Me>("/me"),
    staleTime: 60_000,
    retry: false,
  })
}

function subjectOf(me: Me | undefined) {
  return me
    ? { permissions: me.permissions, entitlements: me.tenant ? { plan: me.tenant.plan, addons: me.tenant.addons } : null }
    : null
}

/** Authorization helpers bound to the current user (same `can()` the API uses). */
export function useAccess() {
  const { data: me } = useMe()
  const subject = subjectOf(me)
  return {
    me,
    can: (p: Permission | PlatformPermission) => can(subject, p),
    canDo: (r: Resource, a: Action) => canDo(subject, r, a),
    reason: (r: Resource) => accessReason(subject, r),
    tabAllowed: (tab: string) => (me?.tenant ? isTabEntitled({ plan: me.tenant.plan, addons: me.tenant.addons }, tab) : true),
  }
}

export function useCan(permission: Permission | PlatformPermission) {
  return useAccess().can(permission)
}

/** Renders children only when the permission is granted. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission | PlatformPermission
  children: ReactNode
  fallback?: ReactNode
}) {
  return <>{useCan(permission) ? children : fallback}</>
}
