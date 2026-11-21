"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { Button, EmptyState, LockIcon, PageHeader, Pill, ShieldAlertIcon } from "@/design-system"
import { moduleById, type ModuleDef } from "@/modules/registry"
import { PACKAGE_INFO, RESOURCE_PACKAGE } from "@/shared/auth/entitlements"
import { useAccess } from "./session"

interface ModulePageProps {
  module: string
  /** Header actions (buttons). Hidden when access is denied. */
  actions?: ReactNode
  /** Override the module description / title. */
  title?: ReactNode
  description?: ReactNode
  /** Phase override (e.g. a Faz 2 tab inside an MVP module). */
  phase?: string
  /** Hide the default header (detail pages render their own). */
  hideHeader?: boolean
  children: ReactNode
}

/**
 * Standard module page: permission + package gate, then page header.
 * Every panel route renders through this, so access rules live in one place.
 */
export function ModulePage({ module, actions, title, description, phase, hideHeader, children }: ModulePageProps) {
  const mod = moduleById(module) as ModuleDef
  const { me, reason } = useAccess()
  const access = reason(mod.resource)

  // Session not resolved yet (server render / first paint): the shell shows the loader.
  if (!me) return null
  if (access !== "ok") return <AccessDenied mod={mod} reason={access} />

  return (
    <>
      {!hideHeader && (
        <PageHeader
          eyebrow={
            <>
              {mod.group}
              <Pill>{phase ?? mod.phase}</Pill>
            </>
          }
          title={title ?? mod.name}
          description={description ?? mod.description}
          actions={actions}
        />
      )}
      {children}
    </>
  )
}

export function AccessDenied({ mod, reason }: { mod: ModuleDef; reason: "role" | "package" }) {
  const pkg = RESOURCE_PACKAGE[mod.resource]
  const { canDo } = useAccess()
  const router = useRouter()
  return (
    <>
      <PageHeader eyebrow={mod.group} title={mod.name} description={mod.description} />
      {reason === "package" && pkg ? (
        <EmptyState
          icon={<LockIcon size={24} />}
          title="Bu modül paketinize dahil değil"
          description={`${mod.name}, “${PACKAGE_INFO[pkg].name}” paketi ile kullanılabilir. ${PACKAGE_INFO[pkg].description}.`}
          action={
            canDo("billing", "view") ? (
              <Button variant="primary" onClick={() => router.push(`/settings?tab=${encodeURIComponent("Paket & kullanım")}`)}>
                Paket seçeneklerini gör
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmptyState
          icon={<ShieldAlertIcon size={24} />}
          title="Bu modüle erişim yetkiniz yok"
          description="Rolünüz bu sayfayı görüntülemeye izin vermiyor. Erişim için şirket yöneticinizle görüşün."
        />
      )}
    </>
  )
}
