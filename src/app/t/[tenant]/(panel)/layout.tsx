import type { ReactNode } from "react"
import { PanelShell } from "@/app-shell/PanelShell"

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <PanelShell>{children}</PanelShell>
}
