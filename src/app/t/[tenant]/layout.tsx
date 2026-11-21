import { Suspense, type ReactNode } from "react"
import { SkeletonGroup } from "@/design-system"

/**
 * Tenant surface root. Everything below is a client app driven by the API
 * (session, permissions, data), so the static shell is just this fallback.
 */
export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl p-10">
          <SkeletonGroup label="Yükleniyor" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
