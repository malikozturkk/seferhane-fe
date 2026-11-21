import "server-only"
import type { Activity, Comment } from "@/shared/contracts/common"
import { now } from "@/shared/lib/clock"
import { newId } from "../db/ids"
import type { TenantData } from "../db/types"

/** Plan §10: every write lands in the activity table (who, when, what, old/new). */
export function logActivity(
  data: TenantData,
  actorName: string,
  entity: { type: string; id: string; label: string },
  action: string,
  summary: string,
  changes?: Activity["changes"],
) {
  const activity: Activity = {
    id: newId("act"),
    actorName,
    entityType: entity.type,
    entityId: entity.id,
    entityLabel: entity.label,
    action,
    summary,
    changes,
    createdAt: now(),
  }
  data.activities.unshift(activity)
  return activity
}

export function diff<T extends object>(before: T, after: Partial<T>): Activity["changes"] {
  return (Object.keys(after) as Array<keyof T>)
    .filter((k) => after[k] !== undefined && JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ field: String(k), from: before[k], to: after[k] }))
}

export function addComment(data: TenantData, entityType: string, entityId: string, authorName: string, text: string, internal = true) {
  const comment: Comment = { id: newId("cmt"), entityType, entityId, authorName, text, internal, createdAt: now() }
  data.comments.push(comment)
  return comment
}

export function timelineFor(data: TenantData, entityType: string, entityId: string, includeInternal = true) {
  return {
    activities: data.activities.filter((a) => a.entityType === entityType && a.entityId === entityId),
    comments: data.comments.filter(
      (c) => c.entityType === entityType && c.entityId === entityId && (includeInternal || !c.internal),
    ),
  }
}
