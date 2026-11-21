"use client"

import { useState } from "react"
import { Button, PlusIcon } from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { TAB_KIND, RECORD_KIND_CONFIG } from "@/entities/record/kinds"
import { RecordCreateModal, RecordDetailModal, RecordsTable } from "@/entities/record/RecordsPanel"
import { useApiQuery } from "@/shared/api/query"
import type { StatCard } from "@/shared/contracts/common"
import type { WorkRecord } from "@/shared/contracts/resources"

/** Kalite & denetim — plan §5.6. Every tab is a config-driven record list. */
export function QualityScreen() {
  const { canDo } = useAccess()
  const [creating, setCreating] = useState<string | null>(null)
  const [selected, setSelected] = useState<WorkRecord | null>(null)
  const stats = useApiQuery<StatCard[]>(["records", "stats", "quality"], "/records/stats/quality")

  return (
    <>
      <ModuleWorkspace
        module="quality"
        stats={stats.data}
        actions={(tab) =>
          canDo("quality", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(tab)}>
              {RECORD_KIND_CONFIG[TAB_KIND[tab]].createLabel}
            </Button>
          )
        }
      >
        {(tab, list) => (
          <RecordsTable kind={TAB_KIND[tab]} params={list.params} page={list.page} onPage={list.setPage} onOpen={setSelected} />
        )}
      </ModuleWorkspace>
      {creating && <RecordCreateModal kind={TAB_KIND[creating]} open onClose={() => setCreating(null)} />}
      <RecordDetailModal record={selected} onClose={() => setSelected(null)} moduleName="Kalite & denetim" />
    </>
  )
}
