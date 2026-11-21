/** Tiny className joiner — avoids adding `clsx` as a dependency. */
export function cn(...values: Array<string | false | null | undefined | 0>) {
  return values.filter(Boolean).join(" ")
}
