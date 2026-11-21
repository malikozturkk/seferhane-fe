"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { http } from "@/shared/api/http"

export function useLogout() {
  const qc = useQueryClient()
  const router = useRouter()
  return useCallback(async () => {
    await http.post("/auth/logout").catch(() => undefined)
    qc.clear()
    router.replace("/login")
  }, [qc, router])
}
