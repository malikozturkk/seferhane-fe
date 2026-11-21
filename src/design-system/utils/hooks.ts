"use client"

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react"

/** Controlled / uncontrolled state helper. */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
) {
  const [inner, setInner] = useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? (value as T) : inner
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInner(next)
      onChange?.(next)
    },
    [controlled, onChange],
  )
  return [current, set] as const
}

/** Closes floating UI on outside pointer-down and on Escape. */
export function useDismiss(
  open: boolean,
  onDismiss: () => void,
  refs: Array<RefObject<HTMLElement | null>>,
) {
  const latest = useRef(onDismiss)
  useEffect(() => {
    latest.current = onDismiss
  })
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (refs.some((r) => r.current?.contains(target))) return
      latest.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") latest.current()
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Traps Tab focus inside `ref` while `active`, closes on Escape,
 * locks body scroll and restores focus to the previously focused element.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  const latest = useRef(onEscape)
  useEffect(() => {
    latest.current = onEscape
  })
  useEffect(() => {
    if (!active) return
    const node = ref.current
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const first = node?.querySelector<HTMLElement>("[autofocus]") ??
      node?.querySelector<HTMLElement>(FOCUSABLE) ?? node
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        latest.current?.()
        return
      }
      if (e.key !== "Tab" || !node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!items.length) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [active, ref])
}

const noopSubscribe = () => () => {}

/** `true` only after hydration — guards portals during SSR. */
export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

/** Stable id with an optional override. */
export function useStableId(id?: string) {
  const generated = useId()
  return id ?? generated
}
