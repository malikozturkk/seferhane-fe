import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { cn } from "../../utils/cn"
import { Spinner } from "../Spinner/Spinner"
import styles from "./Button.module.css"

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "dashed"
  | "ghost"
  | "link"
  | "danger"
export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * - `primary` — orman yeşili ana aksiyon
   * - `secondary` — beyaz, çerçeveli (referanstaki varsayılan `.btn`)
   * - `dashed` — kesikli çerçeve ("Yük talebi ekle")
   * - `ghost` — çerçevesiz, hover'da yüzey (icon-btn dili)
   * - `link` — metin butonu (`.text-button`, "Tümünü görüntüle")
   * - `danger` — yıkıcı aksiyon (referansta yok, hata token'larından türetildi)
   */
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        styles.button,
        styles[variant],
        variant !== "link" && styles[size],
        fullWidth && styles.fullWidth,
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={13} tone="current" label={null} /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  )
})
