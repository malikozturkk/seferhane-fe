"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { http } from "@/shared/api/http"
import { centralLoginUrl } from "@/shared/tenancy/host"

export function useLogout() {
  const qc = useQueryClient()
  return useCallback(async () => {
    await http.post("/auth/logout").catch(() => undefined)
    qc.clear()
    window.location.assign(centralLoginUrl())
  }, [qc])
}
