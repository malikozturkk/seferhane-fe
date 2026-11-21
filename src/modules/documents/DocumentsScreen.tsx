"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useWatch } from "react-hook-form"
import {
  Alert,
  Avatar,
  Button,
  DataTable,
  DescriptionList,
  DownloadIcon,
  EmptyState,
  FileTextIcon,
  FormGrid,
  IconTile,
  Modal,
  ModalBody,
  ModalFooter,
  ProgressBar,
  ShieldCheckIcon,
  TableCellEntity,
  UploadIcon,
  UploadZone,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { useCustomerOptions, useEmployeeOptions, useStaffNames, useVehicleOptions } from "@/entities/lookups"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import type { StatCard } from "@/shared/contracts/common"
import { DOCUMENT_OWNER_TYPES, documentCreateSchema, type DocumentView, type PermitQuota } from "@/shared/contracts/resources"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, FormTextarea, useZodForm } from "@/shared/forms"
import { addDays, today } from "@/shared/lib/clock"
import { exportCSV } from "@/shared/lib/csv"
import { formatDate } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import type { useListState } from "@/shared/ui/useListState"

type ListState = ReturnType<typeof useListState>

const KEY = ["documents"]
const expiry = (d: DocumentView) => (d.expiresAt ? formatDate(d.expiresAt) : (d.expiryLabel ?? "—"))

export function DocumentsScreen() {
  const router = useRouter()
  const { canDo } = useAccess()
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<DocumentView | null>(null)
  const stats = useApiQuery<StatCard[]>([...KEY, "stats"], "/documents/stats")

  return (
    <>
      <ModuleWorkspace
        module="documents"
        stats={stats.data}
        actions={(tab) =>
          tab !== "Geçiş belgesi kotaları" &&
          canDo("documents", "create") && (
            <Button variant="primary" leftIcon={<UploadIcon size={16} />} onClick={() => setCreating(true)}>
              Belge yükle
            </Button>
          )
        }
        bareTabs={["Geçiş belgesi kotaları"]}
        below={() => (
          <div className="mt-[22px]">
            <Alert
              tone="info"
              icon={<ShieldCheckIcon size={20} />}
              title="Uygunluk kontrolü sefer planlamaya bağlıdır."
              action={
                <Button variant="link" onClick={() => router.push("/planning")}>
                  Planlamaya git
                </Button>
              }
            >
              Süresi dolmuş zorunlu belgesi olan araç veya şoföre sefer ataması yapılamaz.
            </Alert>
          </div>
        )}
      >
        {(tab, list) =>
          tab === "Geçiş belgesi kotaları" ? (
            <Quotas />
          ) : (
            <DocumentTable tab={tab} list={list} onOpen={setSelected} />
          )
        }
      </ModuleWorkspace>
      {creating && <UploadDocumentModal onClose={() => setCreating(false)} />}
      <DocumentDetail doc={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function DocumentTable({
  tab,
  list,
  onOpen,
}: {
  tab: string
  list: ListState
  onOpen: (d: DocumentView) => void
}) {
  const { data } = useListQuery<DocumentView>(KEY, "/documents", { ...list.params, tab })
  return (
    <DataTable<DocumentView>
      aria-label="Belgeler"
      data={data?.items ?? []}
      getRowId={(d) => d.id}
      onRowClick={onOpen}
      selectable
      minWidth={640}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={25} onPage={list.setPage} noun="belge" />}
      columns={[
        {
          key: "name",
          header: "Belge adı",
          sortValue: (d) => d.name,
          cell: (d) => (
            <TableCellEntity
              leading={<IconTile tone="sage" size="sm" icon={<FileTextIcon size={16} />} />}
              title={d.name}
              subtitle={`${d.ownerType} belgesi · v${d.version}${d.source ? ` · ${d.source}` : ""}`}
            />
          ),
        },
        { key: "owner", header: "İlişkili kayıt", sortValue: (d) => d.ownerRef, cell: (d) => d.ownerRef },
        {
          key: "responsible",
          header: "Sorumlu",
          hideOnMobile: true,
          cell: (d) => (
            <span className="flex items-center gap-[7px]">
              <Avatar name={d.responsibleName} size="sm" />
              {d.responsibleName}
            </span>
          ),
        },
        { key: "expires", header: "Bitiş tarihi", sortValue: (d) => d.expiresAt ?? "9999", cell: expiry },
        { key: "status", header: "Durum", sortValue: (d) => d.status, cell: (d) => <StatusBadge status={d.status} /> },
      ]}
    />
  )
}

function Quotas() {
  const { data } = useApiQuery<PermitQuota[]>([...KEY, "quotas"], "/documents/quotas")
  return (
    <div className="pt-4">
      <DataTable<PermitQuota>
        aria-label="Geçiş belgesi kotaları"
        data={data ?? []}
        getRowId={(q) => q.id}
        columns={[
          { key: "country", header: "Ülke / tür", cell: (q) => <TableCellEntity title={`${q.country} · ${q.kind}`} subtitle={`${q.year} yılı · Yıllık kota`} /> },
          { key: "code", header: "Kota", cell: (q) => `${q.code} · ${q.total} adet` },
          { key: "used", header: "Kullanım", cell: (q) => `${q.used} kullanıldı / ${q.total - q.used} kaldı` },
          { key: "bar", header: "Oran", cell: (q) => <div className="w-32"><ProgressBar value={q.used} max={q.total} aria-label={q.country} /></div> },
          { key: "status", header: "Durum", cell: (q) => <StatusBadge status={q.used / q.total >= 0.85 ? "Eşik aşıldı" : "Geçerli"} /> },
        ]}
      />
    </div>
  )
}

function UploadDocumentModal({ onClose }: { onClose: () => void }) {
  const staff = useStaffNames()
  const vehicles = useVehicleOptions()
  const drivers = useEmployeeOptions({ role: "Şoför", active: true })
  const customers = useCustomerOptions()
  const form = useZodForm(documentCreateSchema, {
    defaultValues: { name: "", ownerType: "Araç", ownerRef: "", responsibleName: "", expiresAt: addDays(today(), 365), fileName: "", description: "" },
  })
  const ownerType = useWatch({ control: form.control, name: "ownerType" })
  const refOptions =
    ownerType === "Araç"
      ? (vehicles.data?.items ?? []).map((v) => v.plate)
      : ownerType === "Şoför"
        ? (drivers.data?.items ?? []).map((d) => d.name)
        : ownerType === "Müşteri sözleşmesi"
          ? (customers.data?.items ?? []).map((c) => c.name)
          : null
  const create = useApiMutation((v: unknown) => http.post<DocumentView>("/documents", v), {
    invalidate: [KEY],
    toastError: false,
    success: (d) => `${d.name} yüklendi. Onay bekliyor.`,
    onSuccess: onClose,
  })
  const fileError = form.formState.errors.fileName?.message
  return (
    <Modal open onClose={onClose} title="Belge yükle" subtitle="Belge & uyum · Süre takibi ve onay akışı">
      <Form form={form} onSubmit={(v) => create.mutate({ ...v, responsibleName: v.responsibleName || staff[0] }, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="name" label="Belge adı" placeholder="Örn. Zorunlu trafik sigortası" autoFocus required />
          <FormGrid>
            <FormSelect name="ownerType" label="Belge sahibi" options={[...DOCUMENT_OWNER_TYPES]} />
            {refOptions ? (
              <FormSelect name="ownerRef" label="İlişkili kayıt" placeholder="Seçin" options={refOptions} />
            ) : (
              <FormInput name="ownerRef" label="İlişkili kayıt" placeholder={ownerType === "Operasyon" ? "SFR-2026-0842" : "Şirket"} />
            )}
          </FormGrid>
          <FormGrid>
            <FormSelect name="responsibleName" label="Sorumlu" options={staff} />
            <FormDate name="expiresAt" label="Bitiş tarihi" min={today()} />
          </FormGrid>
          <UploadZone
            accept=".pdf,image/*"
            description="PDF, JPG veya PNG · en fazla 20 MB"
            onFilesChange={([f]) => form.setValue("fileName", f.name, { shouldValidate: true })}
          />
          {fileError && <p className="-mt-3 mb-4 text-2xs text-danger-text">Dosya seçin</p>}
          <FormTextarea name="description" label="Açıklama" rows={2} optional />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Belgeyi yükle
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

function DocumentDetail({ doc, onClose }: { doc: DocumentView | null; onClose: () => void }) {
  const { canDo } = useAccess()
  const approve = useApiMutation(() => http.post(`/documents/${doc!.id}/approve`), {
    invalidate: [KEY],
    success: "Belge onaylandı. Uygunluk durumu güncellendi.",
    onSuccess: onClose,
  })
  const archive = useApiMutation(() => http.post(`/documents/${doc!.id}/archive`), {
    invalidate: [KEY],
    success: "Belge arşivlendi. Versiyon geçmişi korunuyor.",
    onSuccess: onClose,
  })
  if (!doc) return null
  return (
    <Modal open onClose={onClose} size="lg" title={doc.name} subtitle={`${doc.ownerRef} · Belge & uyum`}>
      <ModalBody>
        <div className="flex justify-between text-xs">
          <StatusBadge status={doc.status} />
          <span className="text-ink-subtle">Bitiş: {expiry(doc)}</span>
        </div>
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "İlişkili kayıt", value: `${doc.ownerType} · ${doc.ownerRef}` },
            { label: "Sorumlu", value: doc.responsibleName },
            { label: "Kaynak", value: doc.source ?? "Panel yüklemesi" },
            { label: "Versiyon", value: `v${doc.version} · Güncel sürüm` },
          ]}
        />
        <div className="flex flex-col items-center gap-[13px] rounded-xl border border-dashed border-sage-300 bg-sage-50 px-5 py-[30px] text-center text-sage-subtle">
          <FileTextIcon size={28} />
          <strong className="text-base font-medium text-sage-600">{doc.fileName ?? `${doc.name}.pdf`}</strong>
          <span className="text-2xs">v{doc.version} · 1,2 MB</span>
          <Button
            size="sm"
            leftIcon={<DownloadIcon size={14} />}
            onClick={() => exportCSV([["Belge", "Sahip", "Bitiş"], [doc.name, doc.ownerRef, expiry(doc)]], "belge-bilgileri")}
          >
            Belge bilgilerini indir
          </Button>
        </div>
        <EntityTimeline type="document" id={doc.id} label={doc.name} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
        {canDo("documents", "delete") && !doc.archived && (
          <Button loading={archive.isPending} onClick={() => archive.mutate()}>
            Arşivle
          </Button>
        )}
        {canDo("documents", "approve") && doc.status === "Onay bekliyor" && (
          <Button variant="primary" loading={approve.isPending} onClick={() => approve.mutate()}>
            Onayla
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
