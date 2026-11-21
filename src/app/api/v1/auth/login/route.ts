import { NextResponse } from "next/server"
import { loginSchema } from "@/shared/contracts/tenancy"
import { SESSION_COOKIE } from "@/shared/tenancy/host"
import { encodeSession } from "@/server/auth/session"
import { db } from "@/server/db/store"
import { ApiError, notFound } from "@/server/http/errors"
import { defineHandler } from "@/server/http/handler"
import { logActivity } from "@/server/services/activity"
import { buildMe } from "@/server/services/auth"
import { now } from "@/shared/lib/clock"

export const POST = defineHandler({ auth: "public", body: loginSchema }, ({ req, body, surface, tenant, data }) => {
  const secure = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:"
  const email = body.email.toLowerCase()
  const invalid = new ApiError(401, "Giriş başarısız", "E-posta veya şifre hatalı.", {
    password: "E-posta veya şifre hatalı.",
  })

  let response: NextResponse
  if (surface.kind === "platform") {
    const user = db.platformUsers.find((u) => u.email === email && u.status === "Aktif")
    if (!user || user.password !== body.password) throw invalid
    const role = db.platformRoles.find((r) => r.id === user.roleId)!
    const session = encodeSession(user.id, null)
    response = NextResponse.json(buildMe(user, role, null, null))
    response.cookies.set(SESSION_COOKIE, session.value, cookieOptions(session.maxAge, secure))
    return response
  }

  if (!tenant || !data) throw notFound("Çalışma alanı bulunamadı.")
  if (tenant.status === "Askıda") throw new ApiError(403, "Erişim kapalı", "Bu çalışma alanı askıya alınmış.")
  const user = data.users.find((u) => u.email.toLowerCase() === email)
  if (!user || user.password !== body.password) throw invalid
  if (user.status !== "Aktif") throw new ApiError(403, "Hesap pasif", "Hesabınız pasif durumda. Yöneticinizle görüşün.")
  const role = data.roles.find((r) => r.id === user.roleId)!
  user.lastLoginAt = now()
  logActivity(data, user.name, { type: "user", id: user.id, label: user.name }, "login", "Oturum açtı.")
  const session = encodeSession(user.id, tenant.id)
  response = NextResponse.json(buildMe(user, role, tenant, data))
  response.cookies.set(SESSION_COOKIE, session.value, cookieOptions(session.maxAge, secure))
  return response
})

function cookieOptions(maxAge: number, secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge,
  }
}
