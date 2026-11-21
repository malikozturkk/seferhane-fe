import { Fragment, type ElementType, type ReactNode } from "react"
import { ChevronRightIcon } from "../../icons"
import { cn } from "../../utils/cn"
import styles from "./Breadcrumb.module.css"

export interface BreadcrumbItem {
  label: ReactNode
  href?: string
  onClick?: () => void
  icon?: ReactNode
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  /** Link component for client-side routing (e.g. Next.js `Link`). Default `a`. */
  linkAs?: ElementType
  className?: string
}

/** Location trail (`.breadcrumbs`). The last item is the current page. */
export function Breadcrumb({ items, linkAs: LinkComp = "a", className }: BreadcrumbProps) {
  return (
    <nav aria-label="Konum" className={cn(styles.breadcrumb, className)}>
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1
          const content = (
            <>
              {item.icon}
              {item.label}
            </>
          )
          return (
            <Fragment key={i}>
              {i > 0 && (
                <li aria-hidden className={styles.separator}>
                  <ChevronRightIcon size={12} />
                </li>
              )}
              <li className={cn(i === 0 && items.length > 1 && styles.home, last && styles.current)}>
                {last ? (
                  <span aria-current="page">{content}</span>
                ) : item.href ? (
                  <LinkComp href={item.href}>{content}</LinkComp>
                ) : item.onClick ? (
                  <button type="button" onClick={item.onClick}>
                    {content}
                  </button>
                ) : (
                  <span>{content}</span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
