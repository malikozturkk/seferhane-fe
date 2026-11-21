import "server-only"
import { commentInputSchema } from "@/shared/contracts/common"
import { defineHandler } from "../http/handler"
import { createRouter } from "../http/router"
import { addComment, logActivity, timelineFor } from "../services/activity"

/**
 * "İşlem geçmişi & iç yorumlar" for any record (plan §5.14: nesne bazlı yorum).
 * GET  /timeline/:type/:id
 * POST /timeline/:type/:id/comments
 */
export const timelineRouter = createRouter({
  "GET /:type/:id": defineHandler({ auth: "internal" }, ({ data, params }) => timelineFor(data, params.type, params.id)),
  "POST /:type/:id/comments": defineHandler({ auth: "internal", body: commentInputSchema }, ({ data, user, params, body, searchParams }) => {
    const comment = addComment(data, params.type, params.id, user.name, body.text)
    logActivity(data, user.name, { type: params.type, id: params.id, label: searchParams.get("label") ?? params.id }, "comment", "İç yorum eklendi.")
    return comment
  }),
})
