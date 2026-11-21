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
  FormGrid,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  ProgressBar,
  TableCellEntity,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { useVehicleOptions } from "@/entities/lookups"
import { RECORD_KIND_CONFIG, TAB_KIND } from "@/entities/record/kinds"
import { RecordCreateModal, RecordDetailModal, RecordsTable } from "@/entities/record/RecordsPanel"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import type { StatCard } from "@/shared/contracts/common"
import {
  EMPLOYEE_ROLES,
  SRC_TYPES,
  employeeCreateSchema,
  employeeExitSchema,
  type Employee,
  type WorkRecord,
} from "@/shared/contracts/resources"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, useZodForm } from "@/shared/forms"
import { today } from "@/shared/lib/clock"
import { exportCSV } from "@/shared/lib/csv"
import { formatDate } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import type { useListState } from "@/shared/ui/useListState"

const KEY = ["employees"]

export function PeopleScreen() {
  const { canDo } = useAccess()
  const [creating, setCreating] = useState<string | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [record, setRecord] = useState<WorkRecord | null>(null)
  const stats = useApiQuery<StatCard[]>([...KEY, "stats"], "/employees/stats")
  const people = useListQuery<Employee>(KEY, "/employees", { pageSize: 500 })

  return (
    <>
      <ModuleWorkspace
        module="people"
        stats={stats.data}
        actions={(tab) =>
          tab !== "Performans" &&
          canDo("people", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(tab)}>
              {tab === "Çalışanlar" ? "Çalışan ekle" : RECORD_KIND_CONFIG[TAB_KIND[tab]].createLabel}
            </Button>
          )
        }
        onExport={(tab) =>
          tab === "Çalışanlar" &&
          exportCSV(
            [["Ad soyad", "Rol", "Telefon", "Araç", "Durum"], ...(people.data?.items ?? []).map((e) => [e.name, e.role, e.phone, e.plate ?? "—", e.status])],
            "seferhane-calisanlar",
          )
        }
      >
        {(tab, list) =>
          tab === "Çalışanlar" || tab === "Performans" ? (
            <EmployeeTable tab={tab} list={list} onOpen={setEmployee} />
          ) : (
            <RecordsTable kind={TAB_KIND[tab]} params={list.params} page={list.page} onPage={list.setPage} onOpen={setRecord} />
          )
        }
      </ModuleWorkspace>
      {creating === "Çalışanlar" && <AddEmployeeModal onClose={() => setCreating(null)} />}
      {creating && creating !== "Çalışanlar" && (
        <RecordCreateModal
          kind={TAB_KIND[creating]}
          open
          onClose={() => setCreating(null)}
          refOptions={creating === "Avans & masraf" ? undefined : (people.data?.items ?? []).filter((e) => !e.endDate).map((e) => e.name)}
        />
      )}
      <EmployeeDetail employee={employee} onClose={() => setEmployee(null)} />
      <RecordDetailModal record={record} onClose={() => setRecord(null)} moduleName="Çalışanlar & İK" />
    </>
  )
}

function EmployeeTable({ tab, list, onOpen }: { tab: string; list: ReturnType<typeof useListState>; onOpen: (e: Employee) => void }) {
  const { data } = useListQuery<Employee>(KEY, "/employees", list.params)
  const performance = tab === "Performans"
  return (
    <DataTable<Employee>
      aria-label="Çalışanlar"
      data={data?.items ?? []}
      getRowId={(e) => e.id}
      onRowClick={onOpen}
      selectable={!performance}
      minWidth={680}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="çalışan" />}
      columns={
        performance
          ? [
              { key: "name", header: "Şoför", sortValue: (e) => e.name, cell: (e) => <TableCellEntity leading={<Avatar name={e.name} size="sm" />} title={e.name} subtitle="Zamanında teslim · Evrak hızı · Hasar oranı" /> },
              { key: "plate", header: "Araç", cell: (e) => e.plate ?? "—" },
              { key: "score", header: "Performans puanı", sortValue: (e) => e.score ?? 0, cell: (e) => <div className="w-40"><ProgressBar value={e.score ?? 0} valueLabel={`${e.score ?? 0} / 100`} /></div> },
              { key: "ontime", header: "Zamanında teslim", cell: (e) => `%${Math.min(100, (e.score ?? 90) + 2)}` },
              { key: "status", header: "Durum", cell: (e) => <StatusBadge status={e.status} /> },
            ]
          : [
              {
                key: "name",
                header: "Çalışan",
                sortValue: (e) => e.name,
                cell: (e) => (
                  <TableCellEntity
                    leading={<Avatar name={e.name} size="sm" />}
                    title={e.name}
                    subtitle={`${e.role} · İşe giriş: ${formatDate(e.startDate)}${e.endDate ? ` · İşe çıkış: ${formatDate(e.endDate)}` : ""}`}
                  />
                ),
              },
              { key: "plate", header: "Atanan araç", cell: (e) => e.plate ?? <span className="text-ink-subtle">Araç atanmadı</span> },
              {
                key: "contact",
                header: "Belge / İletişim",
                hideOnMobile: true,
                cell: (e) => (
                  <>
                    {e.role === "Şoför" ? `${e.src ?? "SRC yok"}${e.srcExpiry ? ` · ${formatDate(e.srcExpiry)}` : ""}` : (e.email ?? e.phone)}
                    <CellSub>{e.phone}</CellSub>
                  </>
                ),
              },
              { key: "status", header: "Durum", cell: (e) => <StatusBadge status={e.status} /> },
              { key: "score", header: "Performans", sortValue: (e) => e.score ?? 0, cell: (e) => (e.score ? `${e.score} / 100` : "—") },
            ]
      }
    />
  )
}

function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const vehicles = useVehicleOptions()
  const form = useZodForm(employeeCreateSchema, {
    defaultValues: { name: "", role: "Şoför", phone: "", email: "", startDate: today(), vehicleId: "", src: "Belirtilmedi" },
  })
  const create = useApiMutation((v: unknown) => http.post<Employee>("/employees", v), {
    invalidate: [KEY, ["vehicles"]],
    toastError: false,
    success: (e) => `${e.name} kaydı oluşturuldu.`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Çalışan ekle" subtitle="Çalışanlar & İK · MVP">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="name" label="Ad soyad" autoFocus required />
          <FormGrid>
            <FormSelect name="role" label="Rol" options={[...EMPLOYEE_ROLES]} />
            <FormInput name="phone" label="Telefon (WhatsApp)" type="tel" placeholder="+90 5xx xxx xx xx" required />
          </FormGrid>
          <FormGrid>
            <FormDate name="startDate" label="İşe giriş tarihi" required />
            <FormSelect
              name="vehicleId"
              label="Atanan araç"
              optional
              options={[{ value: "", label: "Araç atanmayacak" }, ...(vehicles.data?.items ?? []).map((v) => ({ value: v.id, label: `${v.plate} · ${v.driverName ? `şu an ${v.driverName}` : "boşta"}` }))]}
            />
          </FormGrid>
          <FormGrid>
            <FormSelect name="src" label="SRC belgesi" options={[...SRC_TYPES]} />
            <FormInput name="email" label="E-posta" type="email" optional />
          </FormGrid>
          <Alert tone="info" title="Kayıtlar silinmez, pasife alınır.">
            İşe çıkış tarihi oluşturma sırasında girilmez. Şoförler sisteme giriş yapmaz; bilgileri WhatsApp&apos;tan iletir.
          </Alert>
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

function EmployeeDetail({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const { canDo } = useAccess()
  const form = useZodForm(employeeExitSchema, { defaultValues: { endDate: today() } })
  const exit = useApiMutation((v: { endDate: string }) => http.post<Employee>(`/employees/${employee!.id}/exit`, v), {
    invalidate: [KEY, ["vehicles"]],
    toastError: false,
    success: () => `${employee!.name} için işe çıkış tarihi kaydedildi. Kayıt pasife alındı, silinmedi.`,
    onSuccess: onClose,
  })
  if (!employee) return null
  return (
    <Modal open onClose={onClose} size="lg" title={employee.name} subtitle={`${employee.role} · Çalışanlar & İK`}>
      <ModalBody>
        <StatusBadge status={employee.status} />
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "Rol", value: employee.role },
            { label: "Telefon (WhatsApp)", value: employee.phone },
            { label: "Atanan araç", value: employee.plate ?? "Araç atanmadı" },
            { label: "Departman", value: employee.department },
            { label: "İşe giriş", value: formatDate(employee.startDate) },
            { label: "İşe çıkış", value: employee.endDate ? formatDate(employee.endDate) : "— · Çalışıyor" },
            ...(employee.score ? [{ label: "Performans", value: `${employee.score} / 100` }] : []),
            ...(employee.src ? [{ label: "SRC belgesi", value: `${employee.src} · ${formatDate(employee.srcExpiry)}` }] : []),
          ]}
        />
        {employee.endDate ? (
          <Alert tone="info" title="Kayıt pasif durumda">
            Çalışan kaydı ve geçmiş seferleri arşivde korunur. Bu çalışana yeni sefer atanamaz.
          </Alert>
        ) : (
          canDo("people", "update") && (
            <Form form={form} onSubmit={(v) => exit.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
              <h3 className="mb-[15px] text-sm font-semibold-soft text-ink-heading">İşten ayrılış</h3>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-[200px]">
                  <FormDate name="endDate" label="İşe çıkış tarihi" min={employee.startDate} flush />
                </div>
                <div className="pt-[25px]">
                  <Button type="submit" loading={exit.isPending}>
                    Çıkışı kaydet · kayıt silinmez
                  </Button>
                </div>
              </div>
            </Form>
          )
        )}
        <EntityTimeline type="employee" id={employee.id} label={employee.name} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
      </ModalFooter>
    </Modal>
  )
}
