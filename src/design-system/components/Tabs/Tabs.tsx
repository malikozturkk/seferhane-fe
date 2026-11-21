"use client"

import { useRef, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "../../utils/cn"
import { useControllableState, useStableId } from "../../utils/hooks"
import { CountBadge } from "../Badge/Badge"
import styles from "./Tabs.module.css"

export type TabItem = string | { value: string; label: ReactNode; count?: number; disabled?: boolean }

const norm = (t: TabItem) => (typeof t === "string" ? { value: t, label: t } : t)

export interface TabsProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** `page` = standalone (bottom margin) · `panel` = inside a Card header (side padding) */
  variant?: "page" | "panel"
  /** Prefix for tab/panel ids so `TabPanel` can reference them. */
  id?: string
  "aria-label"?: string
  className?: string
}

/** Underline tabs (`.tabs`) with roving focus (←/→/Home/End). */
export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  variant = "page",
  id,
  className,
  ...props
}: TabsProps) {
  const list = items.map(norm)
  const [current, setCurrent] = useControllableState(value, defaultValue ?? list[0]?.value, onChange)
  const baseId = useStableId(id)
  const ref = useRef<HTMLDivElement>(null)
  const onKey = (e: KeyboardEvent) => {
    const enabled = list.filter((t) => !t.disabled)
    const i = enabled.findIndex((t) => t.value === current)
    let next: number | null = null
    if (e.key === "ArrowRight") next = (i + 1) % enabled.length
    if (e.key === "ArrowLeft") next = (i - 1 + enabled.length) % enabled.length
    if (e.key === "Home") next = 0
    if (e.key === "End") next = enabled.length - 1
    if (next === null) return
    e.preventDefault()
    setCurrent(enabled[next].value)
    ref.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(enabled[next].value)}"]`)
      ?.focus()
  }
  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={props["aria-label"]}
      className={cn(styles.tabs, styles[variant], className)}
      onKeyDown={onKey}
    >
      {list.map((t) => {
        const selected = t.value === current
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.value}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${t.value}`}
            tabIndex={selected ? 0 : -1}
            disabled={t.disabled}
            data-value={t.value}
            className={cn(styles.tab, selected && styles.active)}
            onClick={() => setCurrent(t.value)}
          >
            {t.label}
            {t.count !== undefined && <CountBadge>{t.count}</CountBadge>}
          </button>
        )
      })}
    </div>
  )
}

export interface TabPanelProps {
  /** Same `id` passed to `Tabs`. */
  tabsId: string
  value: string
  children: ReactNode
  className?: string
}

export function TabPanel({ tabsId, value, children, className }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={`${tabsId}-panel-${value}`}
      aria-labelledby={`${tabsId}-tab-${value}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  )
}
