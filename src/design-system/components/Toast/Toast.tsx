"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { CheckIcon, CircleAlertIcon, XIcon } from "../../icons"
import { cn } from "../../utils/cn"
import { useIsClient } from "../../utils/hooks"
import styles from "./Toast.module.css"

export type ToastTone = "success" | "error"

export interface ToastProps {
  message: ReactNode
  tone?: ToastTone
  onClose?: () => void
  closeLabel?: string
  className?: string
}

/** Single toast surface (`.toast`). Usually rendered through `ToastProvider`. */
export function Toast({ message, tone = "success", onClose, closeLabel = "Bildirimi kapat", className }: ToastProps) {
  return (
    <div
      className={cn(styles.toast, styles[tone], className)}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <span className={styles.icon}>
        {tone === "error" ? <CircleAlertIcon size={17} /> : <CheckIcon size={17} />}
      </span>
      <p>{message}</p>
      {onClose && (
        <button type="button" aria-label={closeLabel} className={styles.close} onClick={onClose}>
          <XIcon size={15} />
        </button>
      )}
    </div>
  )
}

interface ToastOptions {
  tone?: ToastTone
  /** ms; default 5000 (reference). `0` keeps it until closed. */
  duration?: number
}
interface ToastEntry extends Required<ToastOptions> {
  id: number
  message: ReactNode
}
interface ToastContextValue {
  notify: (message: ReactNode, options?: ToastOptions) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export interface ToastProviderProps {
  children: ReactNode
  /**
   * `replace` = one toast at a time like the reference (newest wins);
   * `stack` = keep several.
   */
  mode?: "replace" | "stack"
}

export function ToastProvider({ children, mode = "replace" }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const seq = useRef(0)
  const isClient = useIsClient()

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const notify = useCallback(
    (message: ReactNode, { tone = "success", duration = 5000 }: ToastOptions = {}) => {
      const id = ++seq.current
      setToasts((list) => [...(mode === "replace" ? [] : list), { id, message, tone, duration }])
      if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss, mode],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach(clearTimeout)
  }, [])

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])
  return (
    <ToastContext.Provider value={value}>
      {children}
      {isClient &&
        createPortal(
          <div className={styles.region}>
            {toasts.map((t) => (
              <Toast key={t.id} message={t.message} tone={t.tone} onClose={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

/** `const { notify } = useToast(); notify("Sefer oluşturuldu.")` */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}
