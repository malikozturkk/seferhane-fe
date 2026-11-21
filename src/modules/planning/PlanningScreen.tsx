"use client"

import { useRouter } from "next/navigation"
import { useState, type DragEvent } from "react"
import {
  Alert,
  ArrowRightIcon,
  Avatar,
  Button,
  CalendarDaysIcon,
  Card,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CountBadge,
  FormGrid,
  GripVerticalIcon,
  IconButton,
  LayoutGridIcon,
  ListIcon,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  SegmentedControl,
  Select,
  SendIcon,
  SkeletonGroup,
  StatusIndicator,
  Textarea,
  TruckIcon,
  UsersIcon,
  WrenchIcon,
  cn,
} from "@/design-system"
import { ModulePage } from "@/app-shell/ModulePage"
import { useAccess } from "@/app-shell/session"
import { NewTripModal } from "@/entities/trip/NewTripModal"
import { TripTable } from "@/entities/trip/TripTable"
import { http, ApiClientError } from "@/shared/api/http"
import { useApiMutation, useApiQuery } from "@/shared/api/query"
import { loadCreateSchema, type AssignmentCheck, type Load, type PlanningBoard, type TripView } from "@/shared/contracts/operations"
import { applyServerErrors, Form, FormDate, FormInput, useZodForm } from "@/shared/forms"
import { addDays, today } from "@/shared/lib/clock"
import { formatDate } from "@/shared/lib/format"

const KEY = ["planning"]
const HOURS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]
const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"]
const LOAD_BORDER: Record<Load["color"], string> = { blue: "border-l-chart-3", purple: "border-l-chart-4", green: "border-l-[#a0cda6]" }
const TRIP_TONE: Record<string, string> = {
  Yolda: "border-l-chart-3 bg-info-soft text-info",
  Yüklemede: "border-l-chart-5 bg-warning-soft text-warning",
  "Teslim edildi": "border-l-chart-4 bg-tone-purple-soft text-tone-purple",
  "Evrak bekliyor": "border-l-chart-4 bg-tone-purple-soft text-tone-purple",
  Tamamlandı: "border-l-chart-4 bg-tone-purple-soft text-tone-purple",
}

const position = (time: string) => {
  const h = Number(time.slice(0, 2)) + Number(time.slice(3, 5)) / 60
  return Math.min(58, Math.max(2, ((h - 8) / 12) * 100))
}

export function PlanningScreen() {
  const router = useRouter()
  const { canDo } = useAccess()
  const [date, setDate] = useState(today())
  const [week, setWeek] = useState(false)
  const [view, setView] = useState("board")
  const [assign, setAssign] = useState<{ load: Load; vehicleId?: string } | null>(null)
  const [addingLoad, setAddingLoad] = useState(false)
  const [newTrip, setNewTrip] = useState(false)
  const { data } = useApiQuery<PlanningBoard>(KEY, "/planning/board", { date, week: week ? 1 : undefined })
  const dispatch = useApiMutation(() => http.post<{ sent: number; drivers: number }>(`/planning/dispatch?date=${date}`), {
    invalidate: [KEY, ["trips"]],
    success: (r) => `Günlük sefer planı WhatsApp ile ${r.drivers} şoföre iletildi.`,
  })
  const canPlan = canDo("planning", "create")
  const open = (t: TripView) => router.push(`/operations/${t.id}`)
  const d = new Date(`${date}T00:00:00Z`)
  const dayLabels = Array.from({ length: 6 }, (_, i) => {
    const x = new Date(d.getTime() + i * 86400000)
    return `${DAY_NAMES[x.getUTCDay()]} ${x.getUTCDate()}`
  })

  return (
    <ModulePage
      module="planning"
      actions={
        <>
          {canDo("planning", "update") && (
            <Button leftIcon={<SendIcon size={15} />} loading={dispatch.isPending} onClick={() => dispatch.mutate()}>
              {dispatch.isSuccess ? "Plan iletildi" : "Planı WhatsApp'tan ilet"}
            </Button>
          )}
          {canDo("trips", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setNewTrip(true)}>
              Yeni sefer
            </Button>
          )}
        </>
      }
    >
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-[15px]">
        <div className="flex items-center gap-3.5">
          <IconButton aria-label="Önceki gün" icon={<ChevronLeftIcon size={17} />} onClick={() => setDate(addDays(date, week ? -7 : -1))} />
          <span className="flex items-center gap-[9px] text-base font-medium text-sage-600">
            <CalendarDaysIcon size={16} />
            {week ? `${formatDate(date).slice(0, 2)} – ${formatDate(addDays(date, 6))}` : formatDate(date)}
          </span>
          <IconButton aria-label="Sonraki gün" icon={<ChevronRightIcon size={17} />} onClick={() => setDate(addDays(date, week ? 7 : 1))} />
          <Button onClick={() => setDate(today())}>Bugün</Button>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            aria-label="Planlama aralığı"
            value={week ? "week" : "day"}
            onChange={(v) => setWeek(v === "week")}
            options={[
              { value: "day", label: "Günlük" },
              { value: "week", label: "Haftalık", hint: "Faz 2" },
            ]}
          />
          <SegmentedControl
            variant="icon"
            aria-label="Görünüm"
            value={view}
            onChange={setView}
            options={[
              { value: "board", label: <LayoutGridIcon size={16} />, "aria-label": "Tahta" },
              { value: "list", label: <ListIcon size={17} />, "aria-label": "Liste" },
            ]}
          />
        </div>
      </div>

      {data && (
        <div className="mb-5 flex flex-wrap items-center gap-[25px] text-xs text-sage-500">
          <StatusIndicator label={`${data.summary.availableVehicles} araç müsait`} />
          <span className="flex items-center gap-[7px]">
            <UsersIcon size={14} />
            {data.summary.availableDrivers} şoför uygun
          </span>
          <span className="flex items-center gap-[7px]">
            <CircleAlertIcon size={14} className="text-warning-text" />
            {data.summary.warnings} uygunluk uyarısı
          </span>
          <span className="ml-auto text-ink-subtle">
            Planlanan kapasite <b className="font-medium text-sage-600">%{data.summary.capacity}</b>
          </span>
        </div>
      )}

      {!data ? (
        <SkeletonGroup />
      ) : view === "list" ? (
        <Card>
          <TripTable trips={data.trips} onOpen={open} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[244px_minmax(0,1fr)]">
          <Card title="Planlanmamış yükler" action={<CountBadge>{data.loads.length}</CountBadge>}>
            <p className="px-[17px] pt-3 pb-5 text-2xs leading-relaxed text-sage-subtle">Yükü müsait araca sürükleyin veya atamak için seçin.</p>
            {data.loads.map((l) => (
              <button
                key={l.id}
                type="button"
                draggable={canPlan}
                disabled={!canPlan}
                onDragStart={(e) => e.dataTransfer.setData("load", l.id)}
                onClick={() => setAssign({ load: l })}
                className={cn(
                  "mx-3.5 mb-3.5 block w-[calc(100%-28px)] cursor-grab rounded-md border border-l-[3px] border-sage-200 bg-sage-25 px-3 py-3.5 text-left text-sage-500",
                  LOAD_BORDER[l.color],
                )}
              >
                <div className="flex justify-between text-micro tracking-[1px] text-sage-subtle">
                  <span>YÜK TALEBİ</span>
                  <GripVerticalIcon size={16} />
                </div>
                <h4 className="mt-[13px] mb-[9px] text-sm font-medium text-sage-700">{l.customerName}</h4>
                <p className="flex items-center gap-2 text-xs">
                  {l.from}
                  <ArrowRightIcon size={13} />
                  {l.to}
                </p>
                <footer className="mt-[15px] flex justify-between border-t border-sage-200 pt-3 text-3xs">
                  <span>{l.weight}</span>
                  <b className="font-medium">{l.time}</b>
                </footer>
              </button>
            ))}
            {!data.loads.length && (
              <div className="flex flex-col items-center gap-[13px] px-[15px] py-10 text-center text-sage-500">
                <CheckIcon size={24} />
                <h4 className="text-sm font-medium">Tüm yükler planlandı</h4>
                <p className="text-2xs text-sage-subtle">Günün planı hazır.</p>
              </div>
            )}
            {canPlan && (
              <div className="mx-3.5 mt-0.5 mb-5">
                <Button variant="dashed" fullWidth leftIcon={<PlusIcon size={14} />} onClick={() => setAddingLoad(true)}>
                  Yük talebi ekle
                </Button>
              </div>
            )}
            <div className="border-t border-sage-200 bg-sage-50 px-[17px] py-5">
              <span className="text-micro tracking-[1.2px] text-sage-subtle">AKILLI ATAMA</span>
              <p className="mt-[9px] text-2xs leading-relaxed text-sage-subtle">
                Her atamada belge geçerliliği ve zaman çakışmaları otomatik kontrol edilir.
              </p>
            </div>
          </Card>

          <Card className="overflow-auto">
            <div className="min-w-[600px]">
              <div className="flex border-b border-sage-200 bg-sage-25">
                <span className="w-40 shrink-0 px-4 py-[18px] text-2xs text-sage-500">
                  Araç & şoför
                  <small className="mt-[5px] block text-micro text-sage-subtle">
                    {data.resources.length} yük aracı · {data.trips.length} planlı sefer
                  </small>
                </span>
                <div className="grid flex-1 grid-cols-6 items-center">
                  {(week ? dayLabels : HOURS).map((h) => (
                    <span key={h} className="text-center text-3xs text-sage-subtle">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
              {data.resources.map((r) => {
                const trips = data.trips.filter((t) => t.vehicleId === r.vehicleId)
                const onDrop = (e: DragEvent) => {
                  e.preventDefault()
                  const load = data.loads.find((l) => l.id === e.dataTransfer.getData("load"))
                  if (load) setAssign({ load, vehicleId: r.vehicleId })
                }
                return (
                  <div key={r.vehicleId} className="flex min-h-[102px] border-b border-sage-200">
                    <div className="w-40 shrink-0 border-r border-sage-200 px-[13px] py-[15px]">
                      <strong className="flex gap-1.5 text-xs font-medium text-sage-600">
                        <TruckIcon size={14} />
                        {r.plate}
                      </strong>
                      <span className="mt-[5px] flex items-center gap-1 text-3xs text-sage-subtle">
                        {r.driverName ? (
                          <>
                            <Avatar name={r.driverName} size="xs" />
                            {r.driverName}
                          </>
                        ) : (
                          <>
                            <WrenchIcon size={13} />
                            Şoför atanmamış
                          </>
                        )}
                      </span>
                      <small className={cn("mt-[5px] block text-micro", r.compliance.level === "ok" ? "text-success-text" : "text-warning-text")}>
                        {r.compliance.label}
                      </small>
                    </div>
                    {trips.length ? (
                      <div className="relative flex flex-1" onDragOver={(e) => canPlan && e.preventDefault()} onDrop={onDrop}>
                        {HOURS.map((h) => (
                          <span key={h} className="w-1/6 border-r border-sage-150" />
                        ))}
                        {trips.map((t, i) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => open(t)}
                            className={cn(
                              "absolute top-3 bottom-3 overflow-hidden rounded-md border border-l-[3px] border-sage-200 border-l-[#a4c8b2] bg-success-soft px-3 py-2.5 text-left text-sage-500",
                              TRIP_TONE[t.status],
                            )}
                            style={{
                              left: `${week ? Math.min(80, Math.round((new Date(`${t.date}T00:00:00Z`).getTime() - d.getTime()) / 86400000) * 16.66) : position(t.time) + i * 4}%`,
                              width: week ? "16%" : "40%",
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong className="truncate text-2xs font-medium">{t.customerName}</strong>
                              <span className="text-micro opacity-60">{t.number.slice(-4)}</span>
                            </div>
                            <p className="mt-1.5 flex items-center gap-[5px] text-3xs">
                              {t.from}
                              <ArrowRightIcon size={12} />
                              {t.to}
                            </p>
                            <footer className="mt-2 flex justify-between text-micro opacity-80">
                              <span>{t.status}</span>
                              <span>{t.time}</span>
                            </footer>
                          </button>
                        ))}
                      </div>
                    ) : r.status === "Bakımda" || r.compliance.level === "blocked" ? (
                      <div className="mx-3.5 my-[18px] flex flex-1 items-center justify-center gap-[7px] rounded-md border border-warning-border bg-warning-surface text-2xs text-warning-text">
                        <WrenchIcon size={16} />
                        {r.status === "Bakımda" ? `Bakımda · ${r.nextService}` : r.compliance.label}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canPlan}
                        className="mx-3.5 my-[18px] flex flex-1 items-center justify-center gap-[7px] rounded-md border border-dashed border-sage-200 bg-sage-25 text-2xs text-sage-subtle hover:border-sage-400"
                        onClick={() => data.loads[0] && setAssign({ load: data.loads[0], vehicleId: r.vehicleId })}
                        onDragOver={(e) => canPlan && e.preventDefault()}
                        onDrop={onDrop}
                      >
                        <PlusIcon size={16} />
                        Yükü buraya sürükleyin
                      </button>
                    )}
                  </div>
                )
              })}
              <div className="flex items-center gap-5 p-5 text-3xs text-sage-subtle">
                {[
                  ["Planlandı", "bg-success-soft"],
                  ["Yolda", "bg-chart-3"],
                  ["Yüklemede", "bg-chart-5"],
                  ["Teslim edildi", "bg-chart-4"],
                ].map(([label, color]) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <i className={cn("size-1.5 rounded-[2px]", color)} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {assign && <AssignModal load={assign.load} initialVehicleId={assign.vehicleId} date={date} resources={data?.resources ?? []} onClose={() => setAssign(null)} />}
      {addingLoad && <LoadModal date={date} onClose={() => setAddingLoad(false)} />}
      <NewTripModal open={newTrip} onClose={() => setNewTrip(false)} defaults={{ date }} />
    </ModulePage>
  )
}

function AssignModal({
  load,
  initialVehicleId,
  date,
  resources,
  onClose,
}: {
  load: Load
  initialVehicleId?: string
  date: string
  resources: PlanningBoard["resources"]
  onClose: () => void
}) {
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? resources.find((r) => r.compliance.level === "ok")?.vehicleId ?? resources[0]?.vehicleId ?? "")
  const [note, setNote] = useState("")
  const check = useApiQuery<AssignmentCheck>(["planning", "check", load.id], "/planning/check", { vehicleId, date, time: load.time }, { enabled: !!vehicleId })
  const assign = useApiMutation(() => http.post<TripView>("/planning/assign", { loadId: load.id, vehicleId, date, driverNote: note || undefined }), {
    invalidate: [KEY, ["trips"]],
    toastError: false,
    success: "Sefer planlandı. Sefer bilgisi şoföre WhatsApp'tan iletilecek.",
    onSuccess: onClose,
  })
  const error = assign.error instanceof ApiClientError ? assign.error.message : null
  const blocked = check.data && !check.data.ok
  return (
    <Modal open onClose={onClose} title="Yükü sefere ata" subtitle="Araç ve şoför uygunluğu atama öncesinde kontrol edilir.">
      <ModalBody>
        <div className="mb-[22px] rounded-lg border border-sage-200 bg-sage-50 p-[17px]">
          <strong className="text-base font-medium text-sage-600">{load.customerName}</strong>
          <p className="mt-[9px] text-xs text-sage-subtle">
            {load.from} → {load.to} · {load.weight} · {load.time}
          </p>
        </div>
        <label className="mb-2 block text-xs font-medium text-ink-label" htmlFor="assign-vehicle">
          Araç & şoför
        </label>
        <Select
          id="assign-vehicle"
          value={vehicleId}
          onChange={(e) => {
            setVehicleId(e.target.value)
            assign.reset()
          }}
          options={resources.map((r) => ({ value: r.vehicleId, label: `${r.plate} · ${r.driverName ?? "Şoför atanmamış"}` }))}
        />
        <div className="my-5">
          <Alert tone={blocked || error ? "error" : "success"} icon={<CircleAlertIcon size={18} />} title={error ? "Atama engellendi" : (check.data?.title ?? "Kontrol ediliyor…")}>
            {error ?? check.data?.detail}
          </Alert>
        </div>
        <label className="mb-2 block text-xs font-medium text-ink-label" htmlFor="driver-note">
          Şoför notu (WhatsApp mesajına eklenir)
        </label>
        <Textarea id="driver-note" rows={3} placeholder="Yükleme detayları, giriş kapısı, iletişim..." value={note} onChange={(e) => setNote(e.target.value)} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="primary" leftIcon={<CheckIcon size={15} />} loading={assign.isPending} disabled={blocked} onClick={() => assign.mutate()}>
          Ata & WhatsApp&apos;tan ilet
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function LoadModal({ date, onClose }: { date: string; onClose: () => void }) {
  const form = useZodForm(loadCreateSchema, {
    defaultValues: { customerName: "", from: "", to: "", weight: "", date, time: "13:00", revenue: "" as never },
  })
  const create = useApiMutation((v: unknown) => http.post<Load>("/planning/loads", v), {
    invalidate: [KEY],
    toastError: false,
    success: (l) => `${l.customerName} yük talebi eklendi.`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Yük talebi ekle" subtitle="Planlanmamış yükler sütununa eklenir.">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="customerName" label="Müşteri" autoFocus required />
          <FormGrid>
            <FormInput name="from" label="Yükleme şehri" />
            <FormInput name="to" label="Teslimat şehri" />
          </FormGrid>
          <FormInput name="weight" label="Yük" placeholder="18 ton · 24 palet" />
          <FormGrid>
            <FormDate name="date" label="Tarih" min={today()} />
            <FormDate name="time" label="Saat" mode="time" />
          </FormGrid>
          <FormInput name="revenue" label="Navlun geliri (₺)" type="number" min={1} required />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Yük talebini ekle
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
