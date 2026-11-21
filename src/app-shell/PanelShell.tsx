"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { AppShell, Container, SkeletonGroup } from "@/design-system"
import { ApiClientError } from "@/shared/api/http"
import { centralLoginUrl } from "@/shared/tenancy/host"
import { AppHeader } from "./AppHeader"
import { AppSidebar } from "./AppSidebar"
import { CrumbProvider } from "./crumbs"
import { GlobalSearch } from "./GlobalSearch"
import { HelpModal } from "./HelpModal"
import { useMe } from "./session"

/** Authenticated internal panel layout (sidebar + topbar + content). */
export function PanelShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: me, error, isLoading } = useMe()
  const [menu, setMenu] = useState(false)
  const [search, setSearch] = useState(false)
  const [help, setHelp] = useState(false)

  // Session guards: no session → login; external user → portal.
  useEffect(() => {
    if (error instanceof ApiClientError && error.status === 401) {
      window.location.assign(centralLoginUrl(pathname))
    } else if (me && me.user.kind === "external") {
      router.replace("/portal")
    }
  }, [error, me, pathname, router])

  // ⌘K / Ctrl+K opens global search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearch((s) => !s)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (isLoading || !me || me.user.kind !== "internal") {
    // Keep the page segment in the tree (hidden) so Next.js can render and
    // validate it on the server; the session only resolves in the browser.
    return (
      <>
        <div className="mx-auto w-full max-w-3xl p-10">
          <SkeletonGroup label="Çalışma alanı yükleniyor" />
        </div>
        <div hidden>{children}</div>
      </>
    )
  }

  return (
    <CrumbProvider>
      <AppShell
        sidebar={
          <AppSidebar
            mobileOpen={menu}
            onMobileClose={() => setMenu(false)}
            onSearch={() => setSearch(true)}
            onHelp={() => setHelp(true)}
          />
        }
        header={<AppHeader onMenu={() => setMenu(true)} onSearch={() => setSearch(true)} onHelp={() => setHelp(true)} />}
      >
        <Container>{children}</Container>
      </AppShell>
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
      <HelpModal open={help} onClose={() => setHelp(false)} />
    </CrumbProvider>
  )
}
