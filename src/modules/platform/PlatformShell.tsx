"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import {
  AppShell,
  Brand,
  Building2Icon,
  Container,
  DropdownMenu,
  Header,
  LayoutDashboardIcon,
  LogOutIcon,
  NavGroup,
  NavItem,
  Sidebar,
  SidebarProfile,
  SkeletonGroup,
  UsersRoundIcon,
} from "@/design-system"
import { useAccess, useMe } from "@/app-shell/session"
import { useLogout } from "@/app-shell/useLogout"
import { ApiClientError } from "@/shared/api/http"
import { centralLoginUrl } from "@/shared/tenancy/host"

/** admin.seferhane.com shell — platform admins and referral partners. */
export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { data: me, error } = useMe()
  const { can } = useAccess()
  const logout = useLogout()

  useEffect(() => {
    if (error instanceof ApiClientError && error.status === 401) window.location.assign(centralLoginUrl(pathname))
  }, [error, pathname])

  if (!me) {
    // Page segment stays in the tree (hidden) for server rendering/validation.
    return (
      <>
        <div className="mx-auto max-w-3xl p-10"><SkeletonGroup /></div>
        <div hidden>{children}</div>
      </>
    )
  }
  const admin = can("platform:tenants")
  const items = admin
    ? [
        { href: "/", label: "Genel bakış", icon: LayoutDashboardIcon },
        { href: "/tenants", label: "Firmalar (tenant)", icon: Building2Icon },
        { href: "/partners", label: "İş ortakları", icon: UsersRoundIcon },
      ]
    : [{ href: "/", label: "Portföyüm", icon: LayoutDashboardIcon }]

  return (
    <AppShell
      sidebar={
        <Sidebar
          brand={<Brand label="admin" />}
          footer={
            <DropdownMenu
              align="start"
              side="top"
              width={220}
              title={me.user.name}
              subtitle={me.user.email}
              trigger={(p) => <SidebarProfile {...p} name={me.user.name} title={me.role.name} />}
              items={[{ key: "logout", label: "Çıkış yap", icon: <LogOutIcon size={15} />, onSelect: logout }]}
            />
          }
        >
          <NavGroup label={admin ? "PLATFORM" : "İŞ ORTAĞI"}>
            {items.map((i) => (
              <NavItem key={i.href} linkAs={Link} href={i.href} icon={<i.icon size={17} strokeWidth={1.65} />} label={i.label} active={pathname === i.href} />
            ))}
          </NavGroup>
        </Sidebar>
      }
      header={<Header start={<span className="text-xs text-ink-secondary">Seferhane platform konsolu</span>} />}
    >
      <Container>{children}</Container>
    </AppShell>
  )
}
