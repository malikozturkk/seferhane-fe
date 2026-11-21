"use client"

import { useState } from "react"
import { Avatar, Button, Card, CheckCheckIcon, Clock3Icon, CountBadge, Input, SendIcon, ShieldCheckIcon, cn } from "@/design-system"
import { ModulePage } from "@/app-shell/ModulePage"
import { useAccess } from "@/app-shell/session"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery } from "@/shared/api/query"
import type { Channel, Message } from "@/shared/contracts/management"
import { formatDateTime, formatTime } from "@/shared/lib/format"

const KEY = ["messages"]

/** İletişim & duyurular — departman kanalları, duyurular (WhatsApp), vardiya devir notları. */
export function MessagesScreen() {
  const { canDo } = useAccess()
  const channels = useApiQuery<Array<Channel & { unread: number }>>([...KEY, "channels"], "/messages/channels")
  const [active, setActive] = useState<string | null>(null)
  const channelId = active ?? channels.data?.[0]?.id
  const thread = useApiQuery<{ channel: Channel; messages: Message[] }>([...KEY, channelId], `/messages/channels/${channelId}`, undefined, { enabled: !!channelId })
  const [text, setText] = useState("")
  const send = useApiMutation((t: string) => http.post<Message>(`/messages/channels/${channelId}`, { text: t }), {
    invalidate: [KEY],
    success: () => (thread.data?.channel.kind === "channel" ? "" : "Notunuz akışa eklendi."),
    onSuccess: () => setText(""),
  })
  const channel = thread.data?.channel
  const title = channel?.kind === "announcements" ? "Ekip duyuruları" : channel?.kind === "handover" ? "Vardiya devir defteri" : `# ${channel?.name ?? ""}`

  return (
    <ModulePage module="messages">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
        <Card title="Çalışma alanı" className="max-md:hidden">
          <div className="mt-5">
            {channels.data?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-5 py-[13px] text-left text-xs text-sage-500",
                  c.id === channelId && "bg-sage-100 text-sage-700",
                )}
              >
                <span className="text-[15px] text-sage-subtle">#</span>
                {c.name}
                {c.unread > 0 && <CountBadge className="ml-auto">{c.unread}</CountBadge>}
              </button>
            ))}
          </div>
          <div className="mt-[25px] flex gap-2 border-t border-border-subtle px-[18px] py-[23px] text-sage-subtle">
            <ShieldCheckIcon size={16} className="shrink-0" />
            <p className="text-2xs leading-normal">Bu alan yalnızca şirket içi ekibe görünür.</p>
          </div>
        </Card>

        <Card
          className="flex min-h-[560px] flex-col"
          title={title}
          subtitle={
            channel?.kind === "announcements"
              ? "Ofis ekibi · Şoförlere WhatsApp grubundan iletilir"
              : `Ofis ekibi · ${channel?.memberCount ?? 0} üye`
          }
          headerSpacing="loose"
        >
          <div className="md:hidden">
            <div className="flex gap-2 overflow-x-auto px-5 pb-3">
              {channels.data?.map((c) => (
                <Button key={c.id} size="sm" variant={c.id === channelId ? "primary" : "secondary"} onClick={() => setActive(c.id)}>
                  {c.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex-1 border-t border-border-subtle px-[23px]">
            <p className="m-6 text-center text-3xs text-sage-subtle">Bugün</p>
            {thread.data?.messages.map((m) => (
              <div key={m.id} className="mb-[26px] flex items-start gap-[11px]">
                <Avatar name={m.authorName} size="sm" />
                <div className="flex-1">
                  <strong className="text-xs font-semibold-soft text-sage-700">
                    {m.authorName}
                    <small className="ml-[9px] text-3xs font-normal text-sage-subtle">{formatDateTime(m.createdAt) === formatTime(m.createdAt) ? formatTime(m.createdAt) : formatDateTime(m.createdAt)}</small>
                  </strong>
                  <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-sage-600">{m.text}</p>
                  {m.whatsapp && (
                    <span className={cn("mt-3 flex items-center gap-1 text-2xs", m.whatsapp === "sent" ? "text-success-text" : "text-warning-text")}>
                      {m.whatsapp === "sent" ? <CheckCheckIcon size={14} /> : <Clock3Icon size={14} />}
                      {m.whatsapp === "sent" ? "WhatsApp grubuna iletildi · tüm şoförler" : "WhatsApp grubuna iletilmeyi bekliyor"}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {!thread.data?.messages.length && <p className="py-10 text-center text-xs text-ink-subtle">Bu kanalda henüz mesaj yok.</p>}
          </div>
          {canDo("messages", "create") && (
            <form
              className="flex gap-2.5 border-t border-border-subtle p-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (text.trim()) send.mutate(text.trim())
              }}
            >
              <Input aria-label="Mesaj" placeholder={`${channel?.name ?? ""} için mesaj yazın...`} value={text} onChange={(e) => setText(e.target.value)} />
              <Button type="submit" variant="primary" leftIcon={<SendIcon size={15} />} loading={send.isPending} disabled={!text.trim()}>
                Gönder
              </Button>
            </form>
          )}
        </Card>
      </div>
    </ModulePage>
  )
}
