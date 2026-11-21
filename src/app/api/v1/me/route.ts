import { unauthorized } from "@/server/http/errors"
import { defineHandler } from "@/server/http/handler"
import { buildMe } from "@/server/services/auth"

/** Current user, role, permissions, tenant & sidebar badges. */
export const GET = defineHandler({ auth: "public" }, ({ user, role, tenant, data }) => {
  if (!user || !role) throw unauthorized()
  return buildMe(user, role, tenant, data)
})
