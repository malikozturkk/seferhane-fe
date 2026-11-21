"use client"

import { forwardRef } from "react"
import { Input, type InputProps } from "./Input"

export interface DatePickerProps extends Omit<InputProps, "type"> {
  /** date = gün · time = saat · datetime-local = tarih + saat · month = ay */
  mode?: "date" | "time" | "datetime-local" | "month"
}

/**
 * Date / time picker. The reference design uses the native picker
 * (`<input type="date">` / `type="time"`) styled as a form field, which gives
 * locale-aware keyboard & mobile UI without extra dependencies.
 * Values are ISO strings (`2026-11-03`, `14:30`).
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { mode = "date", ...props },
  ref,
) {
  return <Input ref={ref} type={mode} {...props} />
})
