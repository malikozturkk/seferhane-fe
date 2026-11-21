import { NextResponse } from "next/server"
import { SESSION_COOKIE } from "@/shared/tenancy/host"
import { defineHandler } from "@/server/http/handler"

export const POST = defineHandler({ auth: "public" }, () => {
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 })
  return response
})
