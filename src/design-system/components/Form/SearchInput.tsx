"use client"

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react"
import { SearchIcon, XIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { IconButton } from "../IconButton/IconButton"
import styles from "./Form.module.css"

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value" | "size"> {
  value: string
  onValueChange: (value: string) => void
  /**
   * - `inline` — borderless toolbar search with clear button (`.search-field`)
   * - `command` — large command-palette input with ESC hint (`.global-search`)
   */
  variant?: "inline" | "command"
  clearLabel?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onValueChange,
    variant = "inline",
    placeholder = "Kayıtlarda ara...",
    clearLabel = "Aramayı temizle",
    className,
    ...props
  },
  ref,
) {
  return (
    <div className={cn(variant === "inline" ? styles.search : styles.command, className)}>
      <SearchIcon size={variant === "inline" ? 16 : 20} />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-label={props["aria-label"] ?? placeholder}
        {...props}
      />
      {variant === "inline" && value && (
        <IconButton aria-label={clearLabel} icon={<XIcon size={13} />} onClick={() => onValueChange("")} />
      )}
      {variant === "command" && <kbd>ESC</kbd>}
    </div>
  )
})

export interface SearchTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: ReactNode
  shortcut?: string
}

/** Button that opens global search (`.sidebar-search` with ⌘K hint). */
export function SearchTrigger({
  label = "Hızlı erişim",
  shortcut = "⌘ K",
  className,
  ...props
}: SearchTriggerProps) {
  return (
    <button type="button" className={cn(styles.trigger, className)} {...props}>
      <SearchIcon size={15} />
      <span>{label}</span>
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  )
}
