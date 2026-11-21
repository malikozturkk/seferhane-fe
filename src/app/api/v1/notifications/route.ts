import type { Notification } from "@/shared/contracts/management"
import { defineHandler } from "@/server/http/handler"

export const GET = defineHandler({ auth: "internal" }, ({ data, user }) => {
  const items: Notification[] = data.notifications.map(({ readBy, ...n }) => ({ ...n, read: readBy.includes(user.id) }))
  return { items, unread: items.filter((n) => !n.read).length }
})
