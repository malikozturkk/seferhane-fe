"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  ArrowUpRightIcon,
  Avatar,
  Badge,
  Button,
  Card,
  CheckIcon,
  Checkbox,
  DescriptionList,
  DownloadIcon,
  EmptyState,
  FileCheck2Icon,
  FileTextIcon,
  Grid,
  IconTile,
  ListItem,
  MapPinIcon,
  PageHeader,
  PlusIcon,
  ProgressBar,
  SkeletonGroup,
  Stepper,
  Tabs,
  TruckIcon,
} from "@/design-system"
import { usePageCrumb } from "@/app-shell/crumbs"
import { ModulePage } from "@/app-shell/ModulePage"
import { useAccess } from "@/app-shell/session"
import { useTrip, useTripActions, fileSize } from "@/entities/trip/api"
import { ApiClientError } from "@/shared/api/http"
import { TRIP_STEPS, type TripView } from "@/shared/contracts/operations"
import { exportCSV } from "@/shared/lib/csv"
import { formatDate, formatDateTime, money } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { FilePickButton } from "@/shared/ui/FilePickButton"
import { StatusBadge } from "@/shared/ui/status"
import { TripClosingPanel, TripCosts } from "./components/TripFinance"

const TABS = [
  "Genel bilgiler",
  "Belgeler",
  "Maliyet & kârlılık",
  "Sefer kapanışı",
  "Görevler",
  "Hasar kayıtları",
  "Aktivite & yorumlar",
]

const stageOf = (status: string) =>
  ({ Planlandı: 0, "Şoföre iletildi": 1, Yüklemede: 2, Yolda: 3, "Teslim edildi": 4, "Evrak bekliyor": 4, Tamamlandı: 5 })[status] ?? 0

export function TripDetailScreen({ tripId }: { tripId: string }) {
  const router = useRouter()
  const { canDo } = useAccess()
  const { data, error } = useTrip(tripId)
  const actions = useTripActions(tripId)
  const [tab, setTab] = useState(TABS[0])
  usePageCrumb(data?.trip.number)

  if (error instanceof ApiClientError && error.status === 404)
    return (
      <ModulePage module="operations">
        <EmptyState title="Sefer bulunamadı" description="Bu operasyon dosyası silinmiş ya da erişiminiz yok." />
      </ModulePage>
    )
  if (!data) return <SkeletonGroup />

  const { trip, vehicle, driver, claims } = data
  const editable = canDo("trips", "update")
  const stage = stageOf(trip.status)

  const close = () =>
    actions.close.mutate(undefined, {
      onError: () => setTab("Belgeler"),
    })

  return (
    <ModulePage module="operations" hideHeader>
      <PageHeader
        back={{ label: "Operasyon dosyaları", onClick: () => router.push("/operations") }}
        title={trip.number}
        titleAddon={<StatusBadge status={trip.status} />}
        description={
          <>
            {trip.customerName} <span className="text-ink-subtle">/</span> {trip.from} → {trip.to} <span className="text-ink-subtle">/</span>{" "}
            {trip.operationType}
          </>
        }
        actions={
          <>
            {canDo("trips", "export") && (
              <Button
                leftIcon={<DownloadIcon size={15} />}
                onClick={() =>
                  exportCSV([["Sefer", "Müşteri", "Gelir", "Gider"], [trip.number, trip.customerName, trip.revenue, trip.cost]], trip.number)
                }
              >
                Dışa aktar
              </Button>
            )}
            {canDo("trips", "approve") && trip.status !== "Tamamlandı" && (
              <Button variant="primary" leftIcon={<CheckIcon size={15} />} loading={actions.close.isPending} onClick={close}>
                Dosyayı kapat
              </Button>
            )}
          </>
        }
      />
      <Tabs items={TABS} value={tab} onChange={setTab} aria-label="Dosya bölümleri" />

      <Grid layout="detail">
        <div className="flex min-w-0 flex-col gap-5">
          {tab === "Genel bilgiler" && <Overview trip={trip} stage={stage} editable={editable} />}
          {tab === "Belgeler" && <Documents trip={trip} editable={editable} />}
          {tab === "Maliyet & kârlılık" && <TripCosts trip={trip} editable={editable} />}
          {tab === "Sefer kapanışı" && <TripClosingPanel trip={trip} editable={editable} />}
          {tab === "Görevler" && (
            <Card title="Sefer kontrol listesi">
              <div className="mt-3">
                {trip.checklist.map((c, i) => (
                  <div key={c.label} className="flex items-center justify-between border-b border-border-subtle px-[22px] py-4">
                    <Checkbox
                      variant="task"
                      label={c.label}
                      checked={c.done}
                      disabled={!editable}
                      onChange={(e) => actions.toggleCheck.mutate({ index: i, done: e.target.checked })}
                    />
                    <Avatar name={c.assigneeName} size="sm" />
                  </div>
                ))}
              </div>
              <div className="p-5">
                <Button rightIcon={<ArrowUpRightIcon size={14} />} onClick={() => router.push("/tasks")}>
                  Tüm görevleri aç
                </Button>
              </div>
            </Card>
          )}
          {tab === "Hasar kayıtları" &&
            (claims.length ? (
              <Card title="Hasar kayıtları">
                {claims.map((c) => (
                  <ListItem key={c.id} title={c.title} description={`${c.kind} · ${c.slaLabel}`} trailing={<StatusBadge status={c.status} />} />
                ))}
              </Card>
            ) : (
              <EmptyState
                title="Bu seferde hasar kaydı bulunmuyor"
                description="Yük ve araç hasarlarını ilgili seferle ilişkilendirerek takip edin."
                action={
                  <Button leftIcon={<PlusIcon size={14} />} onClick={() => router.push("/claims")}>
                    Hasar merkezine git
                  </Button>
                }
              />
            ))}
          {tab === "Aktivite & yorumlar" && (
            <Card title="Aktivite & yorumlar" padding="md">
              <EntityTimeline type="trip" id={trip.id} label={trip.number} title="" />
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <Card title="Atanan kaynaklar">
            <div className="flex items-center gap-2.5 px-[19px] pt-[18px]">
              <IconTile tone="sage" icon={<TruckIcon size={20} />} />
              <div>
                <strong className="block text-sm font-medium text-ink-emphasis">{trip.plate}</strong>
                <span className="text-3xs text-ink-subtle">{vehicle ? `${vehicle.model} · ${vehicle.ownership}` : "Öz mal araç"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-[19px] pt-[18px]">
              <Avatar name={trip.driverName || "—"} />
              <div>
                <strong className="block text-sm font-medium text-ink-emphasis">{trip.driverName}</strong>
                <span className="text-3xs text-ink-subtle">{driver?.phone ? `${driver.phone} · WhatsApp` : "Şoför kartı"}</span>
              </div>
            </div>
            <div className="mx-[17px] mt-5 flex items-center gap-1.5 rounded-md bg-sage-100 p-2.5 text-2xs text-sage-600">
              <CheckIcon size={15} />
              <span className="flex-1">Araç & şoför yola çıkabilir</span>
              <CheckIcon size={14} />
            </div>
            <div className="p-5">
              <Button variant="link" rightIcon={<ArrowUpRightIcon size={13} />} onClick={() => router.push("/planning")}>
                Atamayı planlamada görüntüle
              </Button>
            </div>
          </Card>

          <Card
            title="Kapanış özeti"
            action={
              <Button variant="link" rightIcon={<ArrowUpRightIcon size={13} />} onClick={() => setTab("Sefer kapanışı")}>
                {trip.closing ? "Düzenle" : "Gir"}
              </Button>
            }
          >
            {trip.closing ? (
              <DescriptionList
                items={[
                  { label: "Yakıt (çıkış → dönüş)", value: `${trip.closing.fuelOut ?? "—"} L → ${trip.closing.fuelIn ?? "—"} L` },
                  { label: "Yapılan yol", value: trip.closing.km ? `${trip.closing.km.toLocaleString("tr-TR")} km` : "—" },
                  {
                    label: "Avans / yol harcaması",
                    value: `${money(trip.closing.advance ?? 0)} / ${money(trip.closing.expenses.reduce((s, e) => s + e.amount, 0))}`,
                  },
                  { label: "Sevkiyat faturası", value: `${trip.closing.invoices.length} PDF` },
                ]}
              />
            ) : (
              <p className="p-5 text-xs text-ink-subtle">Yakıt, km, avans, yol harcamaları ve sevkiyat faturaları henüz girilmedi.</p>
            )}
          </Card>

          <Card title="Dosya özeti">
            <DescriptionList
              items={[
                { label: "Dosya sorumlusu", value: trip.ownerName },
                { label: "Oluşturulma", value: formatDateTime(trip.createdAt) },
                { label: "Evrak durumu", value: `${trip.docsDone}/${trip.docsTotal} tamamlandı` },
                { label: "Brüt kâr", value: money(trip.profit), tone: "positive" },
                { label: "Kâr marjı", value: `%${(trip.margin * 100).toFixed(1).replace(".", ",")}`, tone: "positive" },
              ]}
            />
          </Card>
          <div className="flex gap-2.5 px-[5px] text-sage-subtle">
            <FileCheck2Icon size={20} className="mt-0.5 shrink-0" />
            <p className="text-2xs leading-relaxed text-sage-subtle">
              <strong className="mb-1 block font-medium text-sage-500">Tek dosya, eksiksiz operasyon.</strong>
              Evraklar tamamlandığında bu dosya otomatik olarak fatura hazırlığına aktarılır.
            </p>
          </div>
        </aside>
      </Grid>
    </ModulePage>
  )
}

function Overview({ trip, stage, editable }: { trip: TripView; stage: number; editable: boolean }) {
  const actions = useTripActions(trip.id)
  return (
    <>
      <Card title="Seferin yolculuğu">
        <Stepper
          current={stage}
          steps={[...TRIP_STEPS]}
          aria-label="Sefer durum adımları"
          onStepClick={
            editable
              ? (i) => (i === 5 ? actions.close.mutate() : actions.setStatus.mutate(TRIP_STEPS[i] as never))
              : undefined
          }
        />
      </Card>
      <Card title="Yükleme & teslimat" action={<Badge tone="green">Zamanında</Badge>}>
        <div className="px-[23px] py-[25px]">
          <Stop
            index="01 · YÜKLEME"
            title={`${trip.from} · ${trip.customerName} Fabrikası`}
            address={trip.loadingAddress}
            date={formatDate(trip.date)}
            window="08:30 – 09:30"
            status={stage >= 2 ? "Tamamlandı" : "Planlandı"}
            first
          />
          <Stop
            index="02 · TESLİMAT"
            title={`${trip.to} · Bölge Dağıtım Merkezi`}
            address={trip.deliveryAddress}
            date={formatDate(trip.date)}
            window={trip.time}
            status={trip.status}
          />
        </div>
      </Card>
      <Card title="Yük & taşıma bilgileri">
        <DescriptionList
          layout="grid"
          items={[
            { label: "Operasyon tipi", value: `${trip.operationType} · ${trip.type}` },
            { label: "Yük tanımı", value: trip.cargo.description },
            { label: "Ağırlık / Hacim", value: trip.cargo.weightVolume },
            { label: "Palet adedi", value: trip.cargo.pallets },
            { label: "Müşteri referansı", value: trip.cargo.customerRef },
            { label: "Özel taşıma notu", value: trip.cargo.note || "—" },
          ]}
        />
      </Card>
    </>
  )
}

function Stop(props: { index: string; title: string; address: string; date: string; window: string; status: string; first?: boolean }) {
  return (
    <div className={`relative flex gap-4 text-sage-500 ${props.first ? "pb-[34px]" : ""}`}>
      {props.first ? (
        <>
          <span className="mt-0.5 size-[15px] shrink-0 rounded-full border-4 border-sage-400 bg-sage-150" />
          <span className="absolute top-[22px] left-2 h-[calc(100%-25px)] border-l border-dashed border-sage-300" />
        </>
      ) : (
        <MapPinIcon size={19} className="shrink-0" />
      )}
      <div className="flex-1">
        <small className="text-3xs tracking-[1px] text-sage-subtle">{props.index}</small>
        <h3 className="my-2 text-base font-semibold text-ink-emphasis">{props.title}</h3>
        <p className="text-xs text-ink-subtle">{props.address}</p>
        <span className="mt-3 flex gap-4 text-2xs text-ink-subtle">
          {props.date} <b className="font-medium text-sage-600">{props.window}</b>
        </span>
      </div>
      <span className="mt-[18px] h-fit max-sm:hidden">
        <StatusBadge status={props.status} />
      </span>
    </div>
  )
}

function Documents({ trip, editable }: { trip: TripView; editable: boolean }) {
  const actions = useTripActions(trip.id)
  return (
    <Card
      title="Operasyon belgeleri"
      subtitle={`${trip.operationType} şablonuna göre ${trip.docsTotal} zorunlu belge. Şoförün WhatsApp'tan gönderdiği fotoğrafları buradan dosyaya yükleyin.`}
    >
      <div className="m-[22px]">
        <ProgressBar variant="boxed" size="sm" value={trip.docsDone} max={trip.docsTotal} label={`${trip.docsDone}/${trip.docsTotal} belge tamamlandı`} />
      </div>
      {trip.documents.map((d) => (
        <ListItem
          key={d.name}
          leading={<IconTile shape="file" tone="sage" icon={<FileTextIcon size={21} />} />}
          title={d.name}
          description={d.uploaded ? `${d.fileName} · ${d.size} · v${d.version}` : "Henüz yüklenmedi · Zorunlu belge"}
          trailing={
            d.uploaded ? (
              <Button
                size="sm"
                leftIcon={<DownloadIcon size={14} />}
                onClick={() => exportCSV([["Belge", "Sefer", "Versiyon"], [d.name, trip.number, `v${d.version}`]], d.name)}
              >
                İndir
              </Button>
            ) : (
              editable && (
                <FilePickButton
                  size="sm"
                  accept=".pdf,image/*"
                  loading={actions.uploadDocument.isPending && actions.uploadDocument.variables?.name === d.name}
                  onFiles={([f]) => actions.uploadDocument.mutate({ name: d.name, fileName: f.name, size: fileSize(f.size) })}
                >
                  Yükle
                </FilePickButton>
              )
            )
          }
        />
      ))}
    </Card>
  )
}
