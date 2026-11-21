"use client"

import { useState } from "react"
import { Avatar, Button, Input, SendIcon, Timeline } from "@/design-system"
import { http } from "../api/http"
import { useApiMutation, useApiQuery } from "../api/query"
import type { Activity, Comment } from "../contracts/common"
import { formatDateTime } from "../lib/format"

/** "İşlem geçmişi & iç yorumlar" — activity timeline + internal comments for any record. */
export function EntityTimeline({
  type,
  id,
  label,
  title = "İşlem geçmişi & iç yorumlar",
}: {
  type: string
  id: string
  label: string
  title?: string
}) {
  const key = ["timeline", type, id]
  const { data } = useApiQuery<{ activities: Activity[]; comments: Comment[] }>(key, `/timeline/${type}/${encodeURIComponent(id)}`)
  const [text, setText] = useState("")
  const send = useApiMutation(
    (t: string) => http.post(`/timeline/${type}/${encodeURIComponent(id)}/comments?label=${encodeURIComponent(label)}`, { text: t }),
    { invalidate: [key], onSuccess: () => setText("") },
  )

  return (
    <section>
      {title && <h3 className="mt-6 mb-4 text-sm font-semibold-soft text-ink-heading">{title}</h3>}
      {data?.activities.length ? (
        <Timeline
          items={data.activities.map((a) => ({
            time: formatDateTime(a.createdAt),
            title: a.summary,
            description: a.actorName,
          }))}
        />
      ) : (
        <p className="text-2xs text-ink-subtle">Henüz işlem kaydı yok.</p>
      )}
      <div className="mt-6 flex flex-col gap-[18px] border-t border-border-subtle pt-[22px]">
        {data?.comments.map((c) => (
          <div key={c.id} className="flex gap-[9px]">
            <Avatar name={c.authorName} size="sm" />
            <p className="text-xs leading-relaxed text-sage-600">
              <strong className="block text-2xs font-medium text-sage-700">
                {c.authorName}
                <small className="font-normal text-sage-subtle"> · İç yorum · {formatDateTime(c.createdAt)}</small>
              </strong>
              {c.text}
            </p>
          </div>
        ))}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) send.mutate(text.trim())
          }}
        >
          <Input
            size="sm"
            aria-label="İç yorum"
            placeholder="Yorum yazın, @ ile ekip arkadaşınızı etiketleyin..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit" variant="primary" aria-label="Gönder" loading={send.isPending} disabled={!text.trim()}>
            <SendIcon size={15} />
          </Button>
        </form>
      </div>
    </section>
  )
}
