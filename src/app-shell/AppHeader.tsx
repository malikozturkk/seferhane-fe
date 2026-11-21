"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Avatar,
  Breadcrumb,
  Building2Icon,
  CircleHelpIcon,
  DropdownMenu,
  Header,
  HeaderDivider,
  IconButton,
  LogOutIcon,
  SearchIcon,
  Settings2Icon,
  StatusIndicator,
} from "@/design-system"
import { moduleFromPath, moduleHref } from "@/modules/registry"
import { today } from "@/shared/lib/clock"
import { formatDateNumeric } from "@/shared/lib/format"
import { useCrumbDetail } from "./crumbs"
import { NotificationsPopover } from "./NotificationsPopover"
import { useAccess } from "./session"
import { useLogout } from "./useLogout"

export function AppHeader({ onMenu, onSearch, onHelp }: { onMenu: () => void; onSearch: () => void; onHelp: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const mod = moduleFromPath(pathname)
  const detail = useCrumbDetail()
  const { me, reason } = useAccess()
  const logout = useLogout()

  const crumbs = [
    { label: "Çalışma alanı", icon: <Building2Icon size={14} />, href: "/" },
    ...(mod ? [{ label: mod.name, href: moduleHref(mod) }] : []),
    ...(detail ? [{ label: detail }] : []),
  ]

  return (
    <Header
      onMenuClick={onMenu}
      start={<Breadcrumb items={crumbs} linkAs={Link} />}
      end={
        <>
          <span className="hidden md:inline-flex">
            <StatusIndicator
              label={<span className="text-xs font-medium tracking-[0.3px] text-ink-secondary">{formatDateNumeric(today())}</span>}
            />
          </span>
          <span className="hidden sm:inline-flex">
            <IconButton aria-label="Genel arama" icon={<SearchIcon size={18} />} onClick={onSearch} />
          </span>
          <NotificationsPopover />
          <HeaderDivider />
          {me && (
            <DropdownMenu
              title={me.user.name}
              subtitle={me.user.email}
              trigger={(p) => (
                <button type="button" {...p} aria-label="Kullanıcı menüsü" className="flex rounded-full">
                  <Avatar name={me.user.name} size="sm" />
                </button>
              )}
              items={[
                ...(reason("settings") === "ok"
                  ? [{ key: "settings", label: "Hesap & ayarlar", icon: <Settings2Icon size={15} />, onSelect: () => router.push("/settings") }]
                  : []),
                ...(reason("portal") === "ok"
                  ? [{ key: "portal", label: "Müşteri portalı", icon: <Building2Icon size={15} />, onSelect: () => router.push("/portal-preview") }]
                  : []),
                { key: "help", label: "Uygulama hakkında", icon: <CircleHelpIcon size={15} />, onSelect: onHelp },
                { key: "logout", label: "Çıkış yap", icon: <LogOutIcon size={15} />, onSelect: logout },
              ]}
            />
          )}
        </>
      }
    />
  )
}
