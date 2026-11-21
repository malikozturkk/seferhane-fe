"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Alert,
  Avatar,
  Badge,
  Brand,
  Button,
  Card,
  CheckIcon,
  CircleAlertIcon,
  DataTable,
  EmptyState,
  FileCheck2Icon,
  FileTextIcon,
  IconButton,
  IconTile,
  ListItem,
  LogOutIcon,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  RouteIcon,
  SearchInput,
  ShieldCheckIcon,
  SkeletonGroup,
  StatGroup,
  Stepper,
  Tabs,
  Timeline,
  Toolbar,
} from "@/design-system"
import { useMe } from "@/app-shell/session"
import { useLogout } from "@/app-shell/useLogout"
import { fileSize } from "@/entities/trip/api"
import { centralLoginUrl } from "@/shared/tenancy/host"
import { ApiClientError, http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import type { Quote } from "@/shared/contracts/commercial"
import { portalComplaintSchema, type ClaimView } from "@/shared/contracts/management"
import { TRIP_STEPS, type TripView } from "@/shared/contracts/operations"
import { applyServerErrors, Form, FormSelect, FormTextarea, useZodForm } from "@/shared/forms"
import { exportCSV } from "@/shared/lib/csv"
import { formatDate, formatDateTime, money } from "@/shared/lib/format"
import { FilePickButton } from "@/shared/ui/FilePickButton"
import { StatusBadge } from "@/shared/ui/status"
import { useListState } from "@/shared/ui/useListState"

type PublicTrip = Omit<TripView, "costItems" | "cost" | "profit" | "margin" | "closing" | "ownerName">
interface Overview {
  customer: { id: string; name: string; contactName: string }
  company: { name: string; phone: string }
  stats: { active: number; onTime: string; lastMonth: number; missingDocs: number }
}

const TABS = ["Seferlerim", "Belgeler & POD", "Teklifler", "Hizmet raporları", "Şikâyetlerim"]
const KEY = ["portal"]
const stageOf = (s: string) => ({ Planlandı: 0, "Şoföre iletildi": 1, Yüklemede: 2, Yolda: 3, "Teslim edildi": 4, "Evrak bekliyor": 4, Tamamlandı: 5 })[s] ?? 0

/** Müşteri portalı — dış kullanıcı deneyimi (plan §5.17). */
export function PortalScreen() {
  const router = useRouter()
  const { data: me, error } = useMe()
  const logout = useLogout()
  const overview = useApiQuery<Overview>([...KEY, "overview"], "/portal/overview", undefined, { enabled: me?.user.kind === "external" })
  const [tab, setTab] = useState(TABS[0])
  const [trip, setTrip] = useState<string | null>(null)
  const [complaint, setComplaint] = useState(false)

  useEffect(() => {
    if (error instanceof ApiClientError && error.status === 401) window.location.assign(centralLoginUrl("/portal"))
    else if (me && me.user.kind !== "external") router.replace("/portal-preview")
  }, [error, me, router])

  if (!me || me.user.kind !== "external" || !overview.data) return <div className="mx-auto max-w-3xl p-10"><SkeletonGroup /></div>
  const o = overview.data

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 md:px-8">
      <div className="mx-auto max-w-[1200px] rounded-[10px] border border-sage-200 bg-surface px-[25px] pb-[25px] max-sm:px-3.5">
        <div className="flex items-center justify-between gap-4 border-b border-sage-200 py-5">
          <Brand label="portal" size="sm" />
          <div className="flex items-center gap-3">
            <Avatar name={me.user.name} size="sm" />
            <div className="max-sm:hidden">
              <strong className="block text-xs font-medium text-sage-600">{me.user.name}</strong>
              <span className="text-2xs text-ink-subtle">{o.customer.name}</span>
            </div>
            <IconButton aria-label="Çıkış yap" icon={<LogOutIcon size={16} />} onClick={logout} />
          </div>
        </div>
        <div className="flex items-center justify-between py-[34px]">
          <div>
            <span className="text-micro font-semibold tracking-eyebrow text-sage-subtle">{o.company.name.toLocaleUpperCase("tr")} MÜŞTERİ ALANI</span>
            <h1 className="mt-2.5 text-3xl font-semibold tracking-heading text-sage-800">Merhaba, {me.user.firstName}.</h1>
            <p className="mt-[11px] text-xs text-sage-muted">Yüklerinizin yolculuğu ve tüm belgeleri burada.</p>
          </div>
          <span className="mr-[15px] rounded-full border border-sage-200 bg-sage-100 p-[17px] text-sage-subtle max-md:hidden">
            <RouteIcon size={58} strokeWidth={1} />
          </span>
        </div>
        <div className="mb-[25px]">
          <StatGroup
            items={[
              { label: "Aktif seferler", value: String(o.stats.active) },
              { label: "Zamanında teslim", value: o.stats.onTime, tone: "positive" },
              { label: "Ekim ayında tamamlanan", value: String(o.stats.lastMonth) },
            ]}
          />
        </div>
        <Tabs items={TABS} value={tab} onChange={setTab} aria-label="Portal bölümleri" />
        {tab === "Seferlerim" && <TripsTab onOpen={setTrip} />}
        {tab === "Belgeler & POD" && <DocumentsTab missing={o.stats.missingDocs} />}
        {tab === "Teklifler" && <QuotesTab />}
        {tab === "Hizmet raporları" && <ReportsTab customer={o.customer.name} />}
        {tab === "Şikâyetlerim" && <ComplaintsTab onCreate={() => setComplaint(true)} />}
        <p className="mt-[26px] flex items-center justify-center gap-[7px] text-center text-3xs leading-relaxed text-sage-subtle">
          <ShieldCheckIcon size={14} className="shrink-0" />
          Yalnızca {o.customer.name} ile ilişkili kayıtlar gösterilir. İç yazışmalar ve şirket maliyetleri paylaşılmaz.
        </p>
      </div>
      {trip && <TripModal id={trip} onClose={() => setTrip(null)} />}
      {complaint && <ComplaintModal onClose={() => setComplaint(false)} />}
    </main>
  )
}

function TripsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const list = useListState({ pageSize: 50 })
  const { data } = useListQuery<PublicTrip>([...KEY, "trips"], "/portal/trips", list.params)
  return (
    <Card>
      <Toolbar start={<SearchInput value={list.q} onValueChange={list.setQ} placeholder="Kendi seferlerinizde arayın..." />} />
      <DataTable<PublicTrip>
        aria-label="Seferlerim"
        data={data?.items ?? []}
        getRowId={(t) => t.id}
        onRowClick={(t) => onOpen(t.id)}
        minWidth={560}
        empty={<EmptyState />}
        columns={[
          { key: "number", header: "Sefer no", cell: (t) => <strong>{t.number}</strong> },
          { key: "route", header: "Güzergâh", cell: (t) => `${t.from} → ${t.to}` },
          { key: "plate", header: "Plaka", cell: (t) => t.plate },
          { key: "status", header: "Durum", cell: (t) => <StatusBadge status={t.status} /> },
          { key: "time", header: "Teslimat", cell: (t) => `${formatDate(t.date)} · ${t.time}` },
        ]}
      />
    </Card>
  )
}

function DocumentsTab({ missing }: { missing: number }) {
  const { data } = useListQuery<PublicTrip>([...KEY, "trips"], "/portal/trips", { pageSize: 50 })
  const upload = useApiMutation((v: { id: string; fileName: string }) => http.post(`/portal/trips/${v.id}/documents`, { fileName: v.fileName }), {
    invalidate: [KEY],
    success: "Belge kontrol için operasyon ekibine iletildi.",
  })
  return (
    <Card title="Operasyon belgeleriniz">
      <div className="m-5">
        <Alert tone={missing ? "warning" : "success"} icon={<CircleAlertIcon size={21} />} title={upload.isSuccess ? "Belgeniz operasyon ekibine iletildi." : missing ? `${missing} seferde eksik belge var.` : "Tüm sefer belgeleriniz tamam."}>
          Eksik evrakı buradan yükleyebilir, teslim edilen seferlerin POD belgelerini indirebilirsiniz.
        </Alert>
      </div>
      {data?.items.map((t) => (
        <ListItem
          key={t.id}
          leading={<IconTile shape="file" tone="sage" icon={<FileCheck2Icon size={22} />} />}
          title={`${t.number} · Teslimat belgeleri`}
          description={`${t.from} → ${t.to} · ${t.docsDone}/${t.docsTotal} belge`}
          trailing={
            t.docsDone < t.docsTotal ? (
              <FilePickButton size="sm" accept=".pdf,image/*" loading={upload.isPending && upload.variables?.id === t.id} onFiles={([f]) => upload.mutate({ id: t.id, fileName: `${f.name} (${fileSize(f.size)})` })}>
                Belge yükle
              </FilePickButton>
            ) : (
              <Button size="sm" leftIcon={<FileTextIcon size={14} />} onClick={() => exportCSV([["Sefer", "Belge sayısı"], [t.number, t.docsDone]], t.number)}>
                POD indir
              </Button>
            )
          }
        />
      ))}
    </Card>
  )
}

function QuotesTab() {
  const { data } = useApiQuery<Quote[]>([...KEY, "quotes"], "/portal/quotes")
  const accept = useApiMutation((id: string) => http.post(`/portal/quotes/${id}/accept`), { invalidate: [KEY], success: "Teklif kabul edildi. Operasyon ekibine bildirildi." })
  if (!data?.length) return <Card><EmptyState title="Bekleyen teklif yok" description="Yeni teklifleriniz burada görünür." /></Card>
  return (
    <Card title="Onayınızı bekleyen teklifler">
      {data.map((q) => (
        <div key={q.id} className="flex items-center justify-between gap-[25px] border-b border-border-subtle p-[25px] last:border-0 max-sm:flex-col max-sm:items-start">
          <div>
            <StatusBadge status={q.status} />
            <h2 className="mt-[18px] mb-3 text-2xl font-medium text-sage-700">
              {q.from} → {q.to}
            </h2>
            <p className="mb-3 text-xs text-sage-muted">{q.details}</p>
            <span className="text-3xs text-sage-subtle">
              {q.number} · {formatDate(q.validUntil)} tarihine kadar geçerli
            </span>
          </div>
          <div className="flex flex-col gap-5">
            <strong className="text-[26px] font-medium text-sage-700">
              {money(q.price)}
              <small className="mt-2 block text-3xs font-normal text-sage-subtle">/ sefer + KDV</small>
            </strong>
            <Button variant="primary" leftIcon={<CheckIcon size={15} />} disabled={q.status !== "Onay bekliyor"} loading={accept.isPending} onClick={() => accept.mutate(q.id)}>
              {q.status === "Onay bekliyor" ? "Teklifi onayla" : "Teklif kabul edildi"}
            </Button>
          </div>
        </div>
      ))}
    </Card>
  )
}

function ReportsTab({ customer }: { customer: string }) {
  const { data } = useApiQuery<Array<{ period: string; trips: number; onTime: string; claims: number }>>([...KEY, "reports"], "/portal/reports")
  return (
    <Card title="Aylık hizmet raporları">
      {data?.map((r) => (
        <ListItem
          key={r.period}
          leading={<IconTile shape="file" tone="sage" icon={<FileTextIcon size={23} />} />}
          title={`${r.period} · ${customer} hizmet raporu`}
          description={`${r.trips} sefer · ${r.onTime} zamanında teslim · ${r.claims} hasar`}
          trailing={
            <Button size="sm" onClick={() => exportCSV([["Dönem", "Sefer", "Zamanında teslim", "Hasar"], [r.period, r.trips, r.onTime, r.claims]], `${r.period}-hizmet-raporu`)}>
              İndir
            </Button>
          }
        />
      ))}
    </Card>
  )
}

function ComplaintsTab({ onCreate }: { onCreate: () => void }) {
  const { data } = useApiQuery<ClaimView[]>([...KEY, "complaints"], "/portal/complaints")
  return (
    <Card
      title="Destek & şikâyetler"
      action={
        <Button variant="primary" leftIcon={<PlusIcon size={14} />} onClick={onCreate}>
          Şikâyet oluştur
        </Button>
      }
    >
      {data?.length ? (
        <div className="mt-3">
          {data.map((c) => (
            <ListItem key={c.id} title={c.title} description={`${c.number} · ${c.description}`} trailing={<StatusBadge status={c.status} />} />
          ))}
        </div>
      ) : (
        <EmptyState title="Açık şikâyetiniz bulunmuyor" description="Bir sorun yaşarsanız buradan operasyon ekibine iletebilirsiniz." />
      )}
    </Card>
  )
}

function TripModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useApiQuery<{ trip: PublicTrip; events: Array<{ at: string; text: string }>; contact: string }>([...KEY, "trip", id], `/portal/trips/${id}`)
  if (!data) return null
  const { trip } = data
  return (
    <Modal open onClose={onClose} title="Sefer bilgileri" subtitle={trip.number}>
      <ModalBody>
        <Badge tone="blue">{trip.status}</Badge>
        <h2 className="mt-6 mb-[15px] text-base font-semibold text-ink-heading">
          {trip.from} → {trip.to}
        </h2>
        <Stepper current={stageOf(trip.status)} steps={[...TRIP_STEPS]} aria-label="Sefer durumu" />
        {data.events.length > 0 && <Timeline items={data.events.map((e) => ({ time: formatDateTime(e.at), title: e.text }))} />}
        <p className="mt-6 text-xs text-ink-subtle">Operasyon iletişim: {data.contact}</p>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
      </ModalFooter>
    </Modal>
  )
}

function ComplaintModal({ onClose }: { onClose: () => void }) {
  const { data } = useListQuery<PublicTrip>([...KEY, "trips"], "/portal/trips", { pageSize: 50 })
  const form = useZodForm(portalComplaintSchema, { defaultValues: { tripId: "", text: "" } })
  const create = useApiMutation((v: unknown) => http.post("/portal/complaints", v), {
    invalidate: [KEY],
    toastError: false,
    success: "Şikâyet kaydı oluşturuldu. Operasyon ekibi sizinle iletişime geçecek.",
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Yeni şikâyet" subtitle="İlk yanıt süresi: 24 saat">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormSelect name="tripId" label="İlgili sefer" placeholder="Sefer seçin" options={(data?.items ?? []).map((t) => ({ value: t.id, label: `${t.number} · ${t.from} → ${t.to}` }))} />
          <FormTextarea name="text" label="Şikâyetiniz" rows={4} placeholder="Yaşadığınız sorunu açıklayın..." />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Kapat</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Şikâyeti gönder
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

