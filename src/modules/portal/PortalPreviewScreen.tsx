"use client"

import { useState } from "react"
import {
  Alert,
  Button,
  Card,
  CopyIcon,
  DataTable,
  EmptyState,
  Grid,
  LinkIcon,
  ListItem,
  Pill,
  Select,
  ShieldCheckIcon,
  useToast,
} from "@/design-system"
import { ModulePage } from "@/app-shell/ModulePage"
import { useAccess } from "@/app-shell/session"
import { useTrips } from "@/entities/trip/api"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery } from "@/shared/api/query"
import type { Paginated } from "@/shared/contracts/common"
import type { Quote } from "@/shared/contracts/commercial"
import type { User } from "@/shared/contracts/tenancy"
import { formatDate } from "@/shared/lib/format"
import { StatusBadge } from "@/shared/ui/status"

interface LinkRow {
  token: string
  purpose: "document_upload" | "quote_approval"
  url: string
  expiresAt: string
  usedAt?: string
  info: { title: string; subtitle: string }
}

/** Panel → Müşteri portalı: portal users and magic links (girişsiz belge / teklif onayı). */
export function PortalPreviewScreen() {
  const { canDo } = useAccess()
  const { notify } = useToast()
  const links = useApiQuery<LinkRow[]>(["links"], "/links")
  const users = useApiQuery<Paginated<User>>(["settings", "access", "users", "portal"], "/settings/users", { tab: "Dış kullanıcılar", pageSize: 100 }, { enabled: canDo("users", "view") })
  const trips = useTrips({ pageSize: 100, filter: "missingDocs" })
  const quotes = useApiQuery<Paginated<Quote>>(["quotes", "portal"], "/quotes", { pageSize: 100 })
  const [target, setTarget] = useState("")
  const create = useApiMutation(
    (v: { purpose: string; targetId: string }) => http.post<{ url: string }>("/links", { ...v, validDays: 7 }),
    {
      invalidate: [["links"]],
      onSuccess: async (r) => {
        await navigator.clipboard?.writeText(r.url).catch(() => undefined)
        notify("Bağlantı oluşturuldu ve panoya kopyalandı. 7 gün geçerli.")
      },
    },
  )
  const options = [
    ...(trips.data?.items ?? []).map((t) => ({ value: `document_upload:${t.id}`, label: `Belge iste · ${t.number} · ${t.customerName}` })),
    ...(quotes.data?.items ?? []).filter((q) => q.status === "Onay bekliyor").map((q) => ({ value: `quote_approval:${q.id}`, label: `Teklif onayı · ${q.number} · ${q.customerName}` })),
  ]

  return (
    <ModulePage module="portal">
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3 text-xs text-sage-muted">
        <span className="flex items-center gap-[9px]">
          <ShieldCheckIcon size={16} />
          Dış kullanıcı deneyimi <Pill>Faz 2</Pill>
        </span>
        <span>Müşteri yalnızca kendi seferlerini, belgelerini ve tekliflerini görür. İç yorumlar ve maliyetler gizlidir.</span>
      </div>
      <Grid layout="cols-2" className="items-start">
        <Card title="Girişsiz bağlantı (magic-link)" subtitle="Müşteriden evrak isteyin veya teklif onayı alın — hesap gerekmez." padding="md">
          {canDo("portal", "create") ? (
            <div className="mb-5 flex flex-wrap gap-2">
              <div className="min-w-[240px] flex-1">
                <Select aria-label="Bağlantı hedefi" placeholder="Sefer veya teklif seçin" value={target} onChange={(e) => setTarget(e.target.value)} options={options} />
              </div>
              <Button
                variant="primary"
                leftIcon={<LinkIcon size={14} />}
                disabled={!target}
                loading={create.isPending}
                onClick={() => {
                  const [purpose, targetId] = target.split(":")
                  create.mutate({ purpose, targetId })
                }}
              >
                Bağlantı oluştur
              </Button>
            </div>
          ) : (
            <Alert tone="info">Bağlantı oluşturma yetkiniz yok.</Alert>
          )}
          {links.data?.map((l) => (
            <ListItem
              key={l.token}
              variant="simple"
              leading={<LinkIcon size={16} />}
              title={`${l.purpose === "document_upload" ? "Belge yükleme" : "Teklif onayı"} · ${l.info.title}`}
              description={`${l.info.subtitle} · son gün ${formatDate(l.expiresAt)}`}
              trailing={
                <>
                  <StatusBadge status={l.usedAt ? "Kullanıldı" : "Aktif"} />
                  <Button
                    size="sm"
                    aria-label="Bağlantıyı kopyala"
                    leftIcon={<CopyIcon size={13} />}
                    onClick={() => navigator.clipboard?.writeText(l.url).then(() => notify("Bağlantı panoya kopyalandı."))}
                  >
                    Kopyala
                  </Button>
                  <a className="text-2xs text-brand underline" href={l.url} target="_blank" rel="noreferrer">
                    Aç
                  </a>
                </>
              }
            />
          ))}
          {!links.data?.length && <EmptyState size="compact" title="Henüz bağlantı yok" />}
        </Card>
        <Card title="Portal kullanıcıları" subtitle="Ayarlar → Kullanıcılar & roller'den “Dış kullanıcı” rolüyle davet edilir.">
          <div className="mt-3">
            <DataTable<User>
              aria-label="Portal kullanıcıları"
              data={users.data?.items ?? []}
              getRowId={(u) => u.id}
              empty={<EmptyState size="compact" title="Portal kullanıcısı yok" />}
              columns={[
                { key: "name", header: "Kullanıcı", cell: (u) => <strong>{u.name}</strong> },
                { key: "customer", header: "Müşteri", cell: (u) => u.customerName ?? "—" },
                { key: "status", header: "Durum", cell: (u) => <StatusBadge status={u.status} /> },
              ]}
            />
          </div>
        </Card>
      </Grid>
    </ModulePage>
  )
}
