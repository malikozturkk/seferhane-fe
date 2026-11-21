"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface CrumbState {
  detail: string | null
  setDetail: (label: string | null) => void
}

const CrumbContext = createContext<CrumbState>({ detail: null, setDetail: () => {} })

export function CrumbProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<string | null>(null)
  return <CrumbContext.Provider value={{ detail, setDetail }}>{children}</CrumbContext.Provider>
}

export const useCrumbDetail = () => useContext(CrumbContext).detail

/** Pages call this to append a detail segment (e.g. trip number) to the breadcrumb. */
export function usePageCrumb(label: string | null | undefined) {
  const { setDetail } = useContext(CrumbContext)
  useEffect(() => {
    setDetail(label ?? null)
    return () => setDetail(null)
  }, [label, setDetail])
}
