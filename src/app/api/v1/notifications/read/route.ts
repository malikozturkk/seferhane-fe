import { defineHandler } from "@/server/http/handler"

/** Mark all notifications as read for the current user. */
export const POST = defineHandler({ auth: "internal" }, ({ data, user }) => {
  for (const n of data.notifications) if (!n.readBy.includes(user.id)) n.readBy.push(user.id)
})
