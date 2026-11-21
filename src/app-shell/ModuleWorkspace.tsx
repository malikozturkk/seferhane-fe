"use client"

import { useSearchParams } from "next/navigation"
import type { ReactNode } from "react"
import {
  Button,
  Card,
  DownloadIcon,
  EmptyState,
  FilterChip,
  LockIcon,
  SearchInput,
  SlidersHorizontalIcon,
  Tabs,
  Toolbar,
} from "@/design-system"
import { moduleById } from "@/modules/registry"
import { PACKAGE_INFO, TAB_PACKAGE } from "@/shared/auth/entitlements"
import type { StatCard } from "@/shared/contracts/common"
import { StatsRow } from "@/shared/ui/StatsRow"
import { useListState } from "@/shared/ui/useListState"
import { ModulePage } from "./ModulePage"
import { useAccess } from "./session"

type ListState = ReturnType<typeof useListState>

const PHASE: Record<string, string> = {
  "Geçiş belgesi kotaları": "Faz 2",
  Teklifler: "Faz 2",
  Tarifeler: "Faz 2",
  Lastikler: "Faz 2",
  "Yakıt & cezalar": "Faz 2",
  "Puantaj & izin": "Faz 2",
  "Avans & masraf": "Faz 2",
  Performans: "Faz 2",
  "Yurt dışı günleri": "Faz 2",
  "Tahsilat takibi": "Faz 2",
  "SOP kütüphanesi": "Faz 3",
}

interface ModuleWorkspaceProps {
  module: string
  stats?: StatCard[]
  /** Header actions for the active tab. */
  actions?: (tab: string) => ReactNode
  /** Content of the active tab (inside the card, below the toolbar). */
  children: (tab: string, list: ListState) => ReactNode
  /** Tabs that render without the search toolbar (charts, custom panels). */
  bareTabs?: string[]
  /** Tabs rendered outside the card (full custom layouts). */
  customTabs?: string[]
  searchPlaceholder?: (tab: string) => string
  onExport?: (tab: string) => void
  /** Content rendered below the card (notices). */
  below?: (tab: string) => ReactNode
  pageSize?: number
}

/**
 * Standard module layout from the Make prototype: header → mini stats →
 * card(tabs → toolbar → content) → notices. Handles tab packages (Faz 2) and
 * search/filter/export state so module screens only describe their content.
 */
export function ModuleWorkspace(props: ModuleWorkspaceProps) {
  const {
  module,
  stats,
  actions,
  children,
  bareTabs = [],
  customTabs = [],
  searchPlaceholder,
  onExport,
  below,
  pageSize = 25,
  } = props
  /** Only modules that pass `stats` (even while loading) get the KPI strip. */
  const withStats = "stats" in props
  const mod = moduleById(module)!
  const tabs = mod.tabs ?? []
  const params = useSearchParams()
  const initial = params.get("tab")
  const list = useListState({ tab: initial && tabs.includes(initial) ? initial : tabs[0], pageSize })
  const tab = list.tab ?? tabs[0]
  const { tabAllowed, canDo } = useAccess()
  const locked = !tabAllowed(tab)
  const pkg = TAB_PACKAGE[tab]

  const lockedState = (
    <EmptyState
      icon={<LockIcon size={24} />}
      title={`${tab} paketinize dahil değil`}
      description={pkg ? `Bu sekme “${PACKAGE_INFO[pkg].name}” paketi ile açılır. ${PACKAGE_INFO[pkg].description}.` : undefined}
    />
  )

  return (
    <ModulePage module={module} phase={PHASE[tab]} actions={!locked && actions?.(tab)}>
      {withStats && <StatsRow stats={stats} />}
      {customTabs.includes(tab) ? (
        <>
          <div className="mb-[23px]">
            <Tabs items={tabs} value={tab} onChange={list.setTab} aria-label={`${mod.name} sekmeleri`} />
          </div>
          {locked ? lockedState : children(tab, list)}
        </>
      ) : (
        <Card>
          <Tabs variant="panel" items={tabs} value={tab} onChange={list.setTab} aria-label={`${mod.name} sekmeleri`} />
          {locked ? (
            lockedState
          ) : (
            <>
              {!bareTabs.includes(tab) && (
                <>
                  <Toolbar
                    start={
                      <SearchInput
                        value={list.q}
                        onValueChange={list.setQ}
                        placeholder={searchPlaceholder?.(tab) ?? `${tab.toLocaleLowerCase("tr")} içinde ara...`}
                      />
                    }
                    end={
                      <>
                        <Button size="sm" leftIcon={<SlidersHorizontalIcon size={14} />} onClick={() => list.toggleFilter("action")}>
                          Filtrele
                        </Button>
                        {onExport && canDo(mod.resource, "export") && (
                          <Button size="sm" leftIcon={<DownloadIcon size={14} />} onClick={() => onExport(tab)}>
                            Dışa aktar
                          </Button>
                        )}
                      </>
                    }
                  />
                  {list.filter && (
                    <div className="px-[21px] pb-3.5">
                      <FilterChip onRemove={list.clearFilter}>Aksiyon bekleyen kayıtlar</FilterChip>
                    </div>
                  )}
                </>
              )}
              {children(tab, list)}
            </>
          )}
        </Card>
      )}
      {!locked && below?.(tab)}
    </ModulePage>
  )
}
