"use client"

import { useRouter } from "next/navigation"
import { useDeferredValue, useState } from "react"
import {
  ArrowUpRightIcon,
  Building2Icon,
  ChevronRightIcon,
  FileTextIcon,
  Modal,
  SearchInput,
  ShieldCheckIcon,
  TruckIcon,
  UsersRoundIcon,
} from "@/design-system"
import { MODULES, moduleHref } from "@/modules/registry"
import { useApiQuery } from "@/shared/api/query"
import type { SearchResult } from "@/shared/contracts/management"
import { matches } from "@/shared/lib/format"
import { useAccess } from "./session"

const TYPE_ICON = {
  trip: FileTextIcon,
  customer: Building2Icon,
  vehicle: TruckIcon,
  employee: UsersRoundIcon,
  document: ShieldCheckIcon,
} as const

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { reason } = useAccess()
  const [q, setQ] = useState("")
  const deferred = useDeferredValue(q)
  const { data: results = [] } = useApiQuery<SearchResult[]>(["search"], "/search", { q: deferred }, { enabled: open })
  const modules = MODULES.filter((m) => reason(m.resource) === "ok" && matches([m.name], q)).slice(0, q ? MODULES.length : 5)

  const go = (href: string) => {
    onClose()
    setQ("")
    router.push(href)
  }

  return (
    <Modal open={open} onClose={onClose} title="Seferhane’de ara" subtitle="Modüller, seferler, müşteriler ve plakalar">
      <SearchInput variant="command" value={q} onValueChange={setQ} placeholder="Nereye gitmek istersiniz?" autoFocus />
      <div className="max-h-[480px] overflow-auto px-3.5 py-[18px]">
        {modules.length > 0 && <GroupLabel>MODÜLLER</GroupLabel>}
        {modules.map((m) => (
          <button key={m.id} type="button" className={ROW} onClick={() => go(moduleHref(m))}>
            <m.icon size={18} />
            <span className="flex-1 text-sm">{m.name}</span>
            <ArrowUpRightIcon size={14} />
          </button>
        ))}
        {results.length > 0 && <GroupLabel>KAYITLAR</GroupLabel>}
        {results.map((r) => {
          const Icon = TYPE_ICON[r.type]
          return (
            <button key={`${r.type}-${r.id}`} type="button" className={ROW} onClick={() => go(r.href)}>
              <Icon size={18} />
              <span className="flex-1 text-sm">
                {r.title}
                <small className="mt-[5px] block text-2xs text-sage-subtle">{r.subtitle}</small>
              </span>
              <ChevronRightIcon size={14} />
            </button>
          )
        })}
        {!modules.length && !results.length && (
          <p className="px-3 py-6 text-center text-xs text-sage-muted">“{q}” için sonuç bulunamadı.</p>
        )}
      </div>
    </Modal>
  )
}

const ROW = "flex w-full items-center gap-3 rounded-md p-3 text-left text-sage-500 hover:bg-sage-100"

function GroupLabel({ children }: { children: string }) {
  return <span className="block px-3 py-2 text-micro font-semibold tracking-eyebrow text-sage-subtle">{children}</span>
}
