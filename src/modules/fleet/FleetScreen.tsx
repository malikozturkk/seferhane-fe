"use client"

import { useState } from "react"
import {
  Alert,
  Avatar,
  Button,
  CellSub,
  DataTable,
  DescriptionList,
  EmptyState,
  FileTextIcon,
  FormGrid,
  IconTile,
  Input,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  Select,
  TableCellEntity,
  TruckIcon,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { useEmployeeOptions } from "@/entities/lookups"
import { RECORD_KIND_CONFIG, TAB_KIND } from "@/entities/record/kinds"
import { RecordCreateModal, RecordDetailModal, RecordsTable } from "@/entities/record/RecordsPanel"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import type { Paginated, StatCard } from "@/shared/contracts/common"
import { VEHICLE_KINDS, vehicleCreateSchema, type DocumentView, type Vehicle, type WorkRecord } from "@/shared/contracts/resources"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, useZodForm } from "@/shared/forms"
import { today } from "@/shared/lib/clock"
import { exportCSV } from "@/shared/lib/csv"
import { formatDate, number } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import type { useListState } from "@/shared/ui/useListState"
import { VehicleCosts } from "./VehicleCosts"

const KEY = ["vehicles"]

export function FleetScreen() {
  const { canDo } = useAccess()
  const [creating, setCreating] = useState<string | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [record, setRecord] = useState<WorkRecord | null>(null)
  const stats = useApiQuery<StatCard[]>([...KEY, "stats"], "/vehicles/stats")
  const plates = useApiQuery<Paginated<Vehicle>>([...KEY, "plates"], "/vehicles", { pageSize: 500 })

  return (
    <>
      <ModuleWorkspace
        module="fleet"
        stats={stats.data}
        bareTabs={["Araç maliyetleri"]}
        actions={(tab) =>
          tab !== "Araç maliyetleri" &&
          canDo("fleet", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(tab)}>
              {tab === "Araçlar" ? "Araç ekle" : RECORD_KIND_CONFIG[TAB_KIND[tab]].createLabel}
            </Button>
          )
        }
        onExport={(tab) =>
          tab === "Araçlar" &&
          exportCSV(
            [["Plaka", "Model", "Şoför", "Km", "Durum"], ...(plates.data?.items ?? []).map((v) => [v.plate, v.model, v.driverName ?? "—", v.km, v.status])],
            "seferhane-filo",
          )
        }
      >
        {(tab, list) =>
          tab === "Araçlar" ? (
            <VehicleTable list={list} onOpen={setVehicle} />
          ) : tab === "Araç maliyetleri" ? (
            <VehicleCosts />
          ) : (
            <RecordsTable kind={TAB_KIND[tab]} params={list.params} page={list.page} onPage={list.setPage} onOpen={setRecord} />
          )
        }
      </ModuleWorkspace>
      {creating === "Araçlar" && <AddVehicleModal onClose={() => setCreating(null)} />}
      {creating && creating !== "Araçlar" && (
        <RecordCreateModal
          kind={TAB_KIND[creating]}
          open
          onClose={() => setCreating(null)}
          refOptions={(plates.data?.items ?? []).map((v) => v.plate)}
        />
      )}
      <VehicleDetail vehicle={vehicle} onClose={() => setVehicle(null)} />
      <RecordDetailModal record={record} onClose={() => setRecord(null)} moduleName="Filo & bakım" />
    </>
  )
}

function VehicleTable({ list, onOpen }: { list: ReturnType<typeof useListState>; onOpen: (v: Vehicle) => void }) {
  const { data } = useListQuery<Vehicle>(KEY, "/vehicles", list.params)
  return (
    <DataTable<Vehicle>
      aria-label="Araçlar"
      data={data?.items ?? []}
      getRowId={(v) => v.id}
      onRowClick={onOpen}
      selectable
      minWidth={700}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="araç" />}
      columns={[
        {
          key: "plate",
          header: "Araç",
          sortValue: (v) => v.plate,
          cell: (v) => (
            <TableCellEntity leading={<IconTile tone="sage" size="sm" icon={<TruckIcon size={16} />} />} title={v.plate} subtitle={`${v.model} · ${v.year}`} />
          ),
        },
        { key: "kind", header: "Tip / Kapasite", hideOnMobile: true, cell: (v) => `${v.body} · ${v.capacity}` },
        {
          key: "driver",
          header: "Atanan çalışan",
          cell: (v) =>
            v.driverName ? (
              <span className="flex items-center gap-[7px]">
                <Avatar name={v.driverName} size="sm" />
                {v.driverName}
              </span>
            ) : (
              <span className="text-ink-subtle">Şoför atanmamış</span>
            ),
        },
        { key: "km", header: "Kilometre", sortValue: (v) => v.km, cell: (v) => `${number(v.km)} km` },
        { key: "status", header: "Durum", sortValue: (v) => v.status, cell: (v) => <StatusBadge status={v.status} /> },
        {
          key: "service",
          header: "Bakım / atama",
          hideOnMobile: true,
          cell: (v) => (
            <>
              {v.nextServiceLabel}
              <CellSub>{v.note ?? (v.assignmentUntil ? `Şoför ataması ${formatDate(v.assignmentUntil)} tarihine kadar` : "Şoför ataması süresiz")}</CellSub>
            </>
          ),
        },
      ]}
    />
  )
}

function AddVehicleModal({ onClose }: { onClose: () => void }) {
  const drivers = useEmployeeOptions({ role: "Şoför", active: true })
  const form = useZodForm(vehicleCreateSchema, {
    defaultValues: { plate: "", model: "", year: 2024, kind: "Çekici", capacity: "", driverId: "", assignmentUntil: "", km: 0 },
  })
  const create = useApiMutation((v: unknown) => http.post<Vehicle>("/vehicles", v), {
    invalidate: [KEY, ["employees"], ["planning"]],
    toastError: false,
    success: (v) => `${v.plate} kaydı oluşturuldu.`,
    onSuccess: onClose,
  })
  const rootError = form.formState.errors.root?.message
  return (
    <Modal open onClose={onClose} title="Araç ekle" subtitle="Filo & bakım · MVP">
      <Form
        form={form}
        onSubmit={(v) =>
          create.mutate(v, {
            onError: (e) => {
              if (!applyServerErrors(form as never, e)) form.setError("root", { message: (e as Error).message })
            },
          })
        }
      >
        <ModalBody>
          <FormInput name="plate" label="Plaka" placeholder="34 ABC 123" autoFocus required />
          <FormGrid>
            <FormInput name="model" label="Marka / model" placeholder="Mercedes-Benz Actros 1848" />
            <FormInput name="year" label="Model yılı" type="number" min={1990} max={2027} />
          </FormGrid>
          <FormGrid>
            <FormSelect name="kind" label="Araç tipi" options={[...VEHICLE_KINDS]} />
            <FormInput name="capacity" label="Kapasite" placeholder="24 ton" />
          </FormGrid>
          <FormGrid>
            <FormSelect
              name="driverId"
              label="Şoför"
              options={[{ value: "", label: "Şoför atanmayacak" }, ...(drivers.data?.items ?? []).map((d) => ({ value: d.id, label: `${d.name} · şu an ${d.plate ?? "boşta"}` }))]}
            />
            <FormDate name="assignmentUntil" label="Şoför atama bitiş tarihi" min={today()} optional />
          </FormGrid>
          <FormInput name="km" label="Güncel kilometre" type="number" min={0} />
          {rootError ? (
            <Alert tone="error" title="Araç eklenemedi">
              {rootError}
            </Alert>
          ) : (
            <Alert tone="info" title="Belgeler Belge & uyum modülünden yüklenir.">
              Bitiş tarihi boş bırakılırsa şoför ataması süresiz olur.
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Kaydı oluştur
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

function VehicleDetail({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const { canDo } = useAccess()
  const drivers = useEmployeeOptions({ role: "Şoför", active: true })
  const docs = useApiQuery<Paginated<DocumentView>>(["documents", "vehicle", vehicle?.plate], "/documents", { ownerRef: vehicle?.plate }, { enabled: !!vehicle })
  const update = useApiMutation((v: { driverId?: string | null; km?: number }) => http.patch<Vehicle>(`/vehicles/${vehicle!.id}`, v), {
    invalidate: [KEY, ["employees"]],
    success: "Araç kartı güncellendi.",
  })
  const [km, setKm] = useState("")
  if (!vehicle) return null
  const editable = canDo("fleet", "update")
  return (
    <Modal open onClose={onClose} size="lg" title={vehicle.plate} subtitle={`${vehicle.model} · ${vehicle.year} · Filo & bakım`}>
      <ModalBody>
        <div className="flex justify-between text-xs">
          <StatusBadge status={vehicle.status} />
          <span className="text-ink-subtle">{number(vehicle.km)} km</span>
        </div>
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "Tip / Kapasite", value: `${vehicle.body} · ${vehicle.capacity}` },
            { label: "Atanan çalışan", value: vehicle.driverName ?? "Şoför atanmamış" },
            { label: "Sahiplik", value: vehicle.ownership },
            { label: "Bakım / atama", value: `${vehicle.nextServiceLabel}${vehicle.assignmentUntil ? ` · ${formatDate(vehicle.assignmentUntil)} tarihine kadar` : ""}` },
          ]}
        />
        {editable && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              aria-label="Şoför ataması"
              value={vehicle.driverId ?? ""}
              onChange={(e) => update.mutate({ driverId: e.target.value || null })}
              options={[{ value: "", label: "Şoför atanmamış" }, ...(drivers.data?.items ?? []).map((d) => ({ value: d.id, label: d.name }))]}
            />
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (km) update.mutate({ km: Number(km) }, { onSuccess: () => setKm("") })
              }}
            >
              <Input
                size="sm"
                type="number"
                min={vehicle.km}
                placeholder="Güncel km"
                aria-label="Güncel kilometre"
                value={km}
                onChange={(e) => setKm(e.target.value)}
              />
              <Button type="submit" size="sm">
                Km güncelle
              </Button>
            </form>
          </div>
        )}
        <Alert tone="info" title="Araç dosyası">
          {vehicle.driverName ? `${vehicle.driverName} atanmış.` : "Şoför atanmamış."} Ruhsat, sigorta ve muayene belgeleri bağlı.
        </Alert>
        <h3 className="mt-6 mb-2 text-sm font-semibold-soft text-ink-heading">Bağlı belgeler</h3>
        {docs.data?.items.map((d) => (
          <ListItem
            key={d.id}
            variant="simple"
            leading={<FileTextIcon size={16} />}
            title={d.name}
            description={d.expiresAt ? formatDate(d.expiresAt) : d.expiryLabel}
            trailing={<StatusBadge status={d.status} />}
          />
        ))}
        <EntityTimeline type="vehicle" id={vehicle.id} label={vehicle.plate} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
      </ModalFooter>
    </Modal>
  )
}
