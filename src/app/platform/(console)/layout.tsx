import type { ReactNode } from "react"
import { PlatformShell } from "@/modules/platform/PlatformShell"

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>
}
