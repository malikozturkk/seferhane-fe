import { Suspense, type ReactNode } from "react"
import { SkeletonGroup } from "@/design-system"

export const metadata = { title: "Platform · Seferhane" }

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-3xl p-10"><SkeletonGroup /></div>}>{children}</Suspense>
  )
}
