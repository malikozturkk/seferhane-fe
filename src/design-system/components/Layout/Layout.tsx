import type { ElementType, HTMLAttributes, ReactNode } from "react"
import { cn } from "../../utils/cn"
import styles from "./Layout.module.css"

/* ------------------------------------------------------------------ */
/* AppShell — sidebar + main column (`.app-shell` / `.main-shell`)     */
/* ------------------------------------------------------------------ */

export interface AppShellProps {
  sidebar?: ReactNode
  header?: ReactNode
  children: ReactNode
  className?: string
}

export function AppShell({ sidebar, header, children, className }: AppShellProps) {
  return (
    <div className={cn(styles.shell, className)}>
      {sidebar}
      <div className={cn(styles.main, sidebar ? styles.withSidebar : undefined)}>
        {header}
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Container (`.main-content`)                                         */
/* ------------------------------------------------------------------ */

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  /** `page` = main content padding & 1760px max · `narrow` = 960px · `none` = only centering */
  size?: "page" | "narrow" | "none"
}

export function Container({ as: Tag = "main", size = "page", className, ...props }: ContainerProps) {
  return <Tag className={cn(styles.container, styles[size], className)} {...props} />
}

/* ------------------------------------------------------------------ */
/* Divider                                                             */
/* ------------------------------------------------------------------ */

export interface DividerProps {
  orientation?: "horizontal" | "vertical"
  /** Vertical margin (horizontal) or height (vertical) in px. */
  spacing?: number
  className?: string
}

export function Divider({ orientation = "horizontal", spacing, className }: DividerProps) {
  return (
    <span
      role="separator"
      aria-orientation={orientation}
      className={cn(styles.divider, styles[orientation], className)}
      style={orientation === "horizontal" ? { marginBlock: spacing } : { height: spacing }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Grid helpers (dashboard layouts)                                    */
/* ------------------------------------------------------------------ */

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * - `charts` — 1.95fr / 1fr (`.dashboard-charts`)
   * - `detail` — content / 290px aside (`.detail-layout`)
   * - `cols-2` · `cols-3` — equal columns
   */
  layout?: "charts" | "detail" | "cols-2" | "cols-3"
}

export function Grid({ layout = "cols-3", className, ...props }: GridProps) {
  return <div className={cn(styles.grid, styles[layout], className)} {...props} />
}

/** Vertical stack with consistent gap. */
export function Stack({
  gap = 20,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { gap?: number }) {
  return <div className={cn(styles.stack, className)} style={{ gap, ...style }} {...props} />
}
