"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Brand,
  Building2Icon,
  CircleHelpIcon,
  CountBadge,
  DropdownMenu,
  LockIcon,
  LogOutIcon,
  NavGroup,
  NavItem,
  Pill,
  SearchTrigger,
  Settings2Icon,
  Sidebar,
  SidebarProfile,
  WorkspaceSwitcher,
  useToast,
} from "@/design-system"
import { MODULES, NAV_GROUPS, moduleFromPath, moduleHref } from "@/modules/registry"
import { useAccess } from "./session"
import { useLogout } from "./useLogout"

interface AppSidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
  onSearch: () => void
  onHelp: () => void
}

export function AppSidebar({ mobileOpen, onMobileClose, onSearch, onHelp }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const active = moduleFromPath(pathname)
  const { me, reason } = useAccess()
  const { notify } = useToast()
  const logout = useLogout()
  if (!me?.tenant) return null
  const tenant = me.tenant

  return (
    <Sidebar
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
      brand={
        <Link href="/" aria-label="Genel bakış" onClick={onMobileClose}>
          <Brand />
        </Link>
      }
      header={
        <>
          <DropdownMenu
            align="start"
            width="100%"
            title="Çalışma alanı"
            footer="Şirket verileri diğer çalışma alanlarından izoledir."
            trigger={(p) => (
              <WorkspaceSwitcher {...p} logo={<Building2Icon size={20} />} name={tenant.name} description="Şirket çalışma alanı" />
            )}
            items={[
              {
                key: tenant.id,
                label: tenant.legalName,
                selected: true,
                onSelect: () => notify(`${tenant.name} çalışma alanındasınız.`),
              },
            ]}
          />
          <SearchTrigger onClick={onSearch} />
        </>
      }
      footer={
        <>
          {reason("settings") === "ok" && (
            <NavItem
              linkAs={Link}
              href="/settings"
              icon={<Settings2Icon size={17} />}
              label="Ayarlar & kullanıcılar"
              active={active?.id === "settings"}
              onClick={onMobileClose}
            />
          )}
          <NavItem icon={<CircleHelpIcon size={17} />} label="Yardım merkezi" external onClick={onHelp} />
          <DropdownMenu
            align="start"
            side="top"
            width={220}
            title={me.user.name}
            subtitle={me.user.email}
            trigger={(p) => <SidebarProfile {...p} name={me.user.name} title={me.role.name} />}
            items={[
              ...(reason("settings") === "ok"
                ? [{ key: "settings", label: "Hesap & ayarlar", icon: <Settings2Icon size={15} />, onSelect: () => router.push("/settings") }]
                : []),
              { key: "logout", label: "Çıkış yap", icon: <LogOutIcon size={15} />, onSelect: logout },
            ]}
          />
        </>
      }
    >
      {NAV_GROUPS.map((group) => {
        const items = MODULES.filter((m) => m.group === group && reason(m.resource) !== "role")
        if (!items.length) return null
        return (
          <NavGroup key={group} label={group}>
            {items.map((m) => {
              const locked = reason(m.resource) === "package"
              const badge = m.badge ? me.badges[m.badge.key] : 0
              return (
                <NavItem
                  key={m.id}
                  linkAs={Link}
                  href={moduleHref(m)}
                  onClick={onMobileClose}
                  icon={<m.icon size={17} strokeWidth={1.65} />}
                  label={m.name}
                  active={active?.id === m.id}
                  trailing={
                    locked ? (
                      <LockIcon size={12} title="Paketinize dahil değil" />
                    ) : badge && m.badge ? (
                      <CountBadge variant={m.badge.tone}>{badge}</CountBadge>
                    ) : m.isNew ? (
                      <Pill variant="new">YENİ</Pill>
                    ) : undefined
                  }
                />
              )
            })}
          </NavGroup>
        )
      })}
    </Sidebar>
  )
}
