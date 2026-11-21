"use client"

import { useRouter } from "next/navigation"
import {
  BellIcon,
  Button,
  CircleAlertIcon,
  FileTextIcon,
  IconButton,
  IconTile,
  ListTodoIcon,
  NotificationItem,
  Popover,
  ShieldCheckIcon,
  TruckIcon,
  WalletIcon,
} from "@/design-system"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery } from "@/shared/api/query"
import type { Notification } from "@/shared/contracts/management"
import { formatDateTime } from "@/shared/lib/format"

const ICONS = {
  shield: ShieldCheckIcon,
  file: FileTextIcon,
  truck: TruckIcon,
  wallet: WalletIcon,
  task: ListTodoIcon,
  alert: CircleAlertIcon,
} as const

export function NotificationsPopover() {
  const router = useRouter()
  const { data } = useApiQuery<{ items: Notification[]; unread: number }>(["notifications"], "/notifications")
  const markRead = useApiMutation(() => http.post("/notifications/read"), { invalidate: [["notifications"]] })
  const unread = data?.unread ?? 0

  return (
    <Popover
      title="Bildirimler"
      count={unread}
      headerAction={
        <Button variant="link" disabled={!unread || markRead.isPending} onClick={() => markRead.mutate()}>
          Tümünü okundu işaretle
        </Button>
      }
      trigger={(p) => (
        <IconButton {...p} aria-label="Bildirimleri aç" icon={<BellIcon size={19} />} indicator={unread > 0} />
      )}
    >
      {data?.items.map((n) => {
        const Icon = ICONS[n.icon]
        return (
          <NotificationItem
            key={n.id}
            icon={<IconTile tone={n.tone} icon={<Icon size={18} />} />}
            title={n.title}
            description={n.text}
            time={formatDateTime(n.createdAt)}
            unread={!n.read}
            onClick={() => router.push(n.href)}
          />
        )
      })}
    </Popover>
  )
}
