"use client"

import { useState, type ReactNode } from "react"
import { ChevronDownIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { useStableId } from "../../utils/hooks"
import styles from "./Accordion.module.css"

export interface AccordionItem {
  value: string
  title: ReactNode
  /** Secondary line under the title. */
  description?: ReactNode
  content: ReactNode
  disabled?: boolean
}

export interface AccordionProps {
  items: AccordionItem[]
  /** `single` keeps at most one section open. */
  type?: "single" | "multiple"
  defaultValue?: string[]
  value?: string[]
  onChange?: (value: string[]) => void
  className?: string
}

/**
 * Disclosure list. Not present in the reference design — row styling follows
 * `.help-link` / `.simple-list` (hairline separators, sage text, chevron).
 */
export function Accordion({
  items,
  type = "single",
  defaultValue = [],
  value,
  onChange,
  className,
}: AccordionProps) {
  const [inner, setInner] = useState<string[]>(defaultValue)
  const open = value ?? inner
  const baseId = useStableId()
  const toggle = (v: string) => {
    const isOpen = open.includes(v)
    const next = isOpen
      ? open.filter((x) => x !== v)
      : type === "single"
        ? [v]
        : [...open, v]
    if (value === undefined) setInner(next)
    onChange?.(next)
  }
  return (
    <div className={cn(styles.accordion, className)}>
      {items.map((item) => {
        const expanded = open.includes(item.value)
        const headerId = `${baseId}-h-${item.value}`
        const panelId = `${baseId}-p-${item.value}`
        return (
          <div key={item.value} className={styles.item}>
            <h3 className={styles.heading}>
              <button
                type="button"
                id={headerId}
                aria-expanded={expanded}
                aria-controls={panelId}
                disabled={item.disabled}
                className={styles.trigger}
                onClick={() => toggle(item.value)}
              >
                <span>
                  {item.title}
                  {item.description && <small>{item.description}</small>}
                </span>
                <ChevronDownIcon size={15} className={cn(styles.chevron, expanded && styles.open)} />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!expanded}
              className={styles.panel}
            >
              {item.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
