"use client"

import { Skeleton, StatGroup } from "@/design-system"
import type { StatCard } from "../contracts/common"

/** Mini-stats strip (`.mini-stats`) fed by a `/stats` endpoint. */
export function StatsRow({ stats, inline = true }: { stats?: StatCard[]; inline?: boolean }) {
  if (!stats) return <Skeleton height={96} shape="block" className="mb-[25px]" />
  return (
    <div className="mb-[25px]">
      <StatGroup
        items={stats.map((s) => ({
          label: s.label,
          value: s.value,
          suffix: inline ? s.caption : undefined,
          caption: inline ? undefined : s.caption,
          tone: s.tone,
        }))}
      />
    </div>
  )
}
