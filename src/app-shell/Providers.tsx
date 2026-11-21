"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { ToastProvider } from "@/design-system"
import { createQueryClient } from "@/shared/api/query"

/** App-wide client providers: server-state cache + toasts. */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient)
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
}
