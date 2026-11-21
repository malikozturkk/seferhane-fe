"use client"

import { useState } from "react"
import {
  Avatar,
  Button,
  Checkbox,
  DataTable,
  DescriptionList,
  EmptyState,
  FileTextIcon,
  FormGrid,
  IconTile,
  Modal,
  ModalBody,
  ModalFooter,
  TableCellEntity,
  Textarea,
  UploadZone,
} from "@/design-system"
import { useAccess } from "@/app-shell/session"
import { useStaffNames } from "@/entities/lookups"
import { http } from "@/shared/api/http"
import { useApiMutation, useListQuery } from "@/shared/api/query"
import type { ListParams } from "@/shared/contracts/common"
import { workRecordCreateSchema, type RecordKind, type WorkRecord } from "@/shared/contracts/resources"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, FormTextarea, useZodForm } from "@/shared/forms"
import { addDays, today } from "@/shared/lib/clock"
import { formatDate, money } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import { RECORD_KIND_CONFIG } from "./kinds"

export const recordKeys = { all: ["records"] as const }

const amountText = (r: WorkRecord) => r.amountLabel ?? (r.amount != null ? money(r.amount) : undefined)
const dateText = (r: WorkRecord) => [r.date ? formatDate(r.date) : null, r.detail].filter(Boolean).join(" · ") || "—"

/** Generic table for config-driven secondary records (Make's generic Workspace table). */
export function RecordsTable({
  kind,
  params,
  page,
  onPage,
  onOpen,
}: {
  kind: RecordKind
  params: ListParams
  page: number
  onPage: (p: number) => void
  onOpen: (r: WorkRecord) => void
}) {
  const cfg = RECORD_KIND_CONFIG[kind]
  const { data } = useListQuery<WorkRecord>([...recordKeys.all, kind], "/records", { ...params, kind } as ListParams)
  const rows = data?.items ?? []
  const hasAmount = rows.some((r) => amountText(r))
  return (
    <DataTable<WorkRecord>
      aria-label={cfg.titleLabel}
      data={rows}
      getRowId={(r) => r.id}
      onRowClick={onOpen}
      selectable
      minWidth={640}
      empty={<EmptyState />}
      footer={<ListFooter total={data?.total ?? 0} page={page} pageSize={Number(params.pageSize ?? 25)} onPage={onPage} />}
      columns={[
        {
          key: "title",
          header: "Kayıt / Açıklama",
          cell: (r) => (
            <TableCellEntity leading={<IconTile tone="sage" size="sm" icon={<FileTextIcon size={16} />} />} title={r.title} subtitle={r.subtitle} />
          ),
        },
        { key: "ref", header: cfg.refLabel, cell: (r) => r.ref, hideOnMobile: true },
        {
          key: "owner",
          header: cfg.ownerLabel,
          hideOnMobile: true,
          cell: (r) => (
            <span className="flex items-center gap-[7px]">
              <Avatar name={r.ownerName} size="sm" />
              {r.ownerName}
            </span>
          ),
        },
        { key: "date", header: cfg.dateLabel, cell: (r) => dateText(r) },
        { key: "status", header: "Durum", cell: (r) => <StatusBadge status={r.status} /> },
        ...(hasAmount ? [{ key: "amount", header: cfg.amountLabel ?? "Tutar / Özet", cell: (r: WorkRecord) => amountText(r) ?? "—" }] : []),
      ]}
    />
  )
}

/** Create modal for a record kind. */
export function RecordCreateModal({ kind, open, onClose, refOptions }: { kind: RecordKind; open: boolean; onClose: () => void; refOptions?: string[] }) {
  const cfg = RECORD_KIND_CONFIG[kind]
  const staff = useStaffNames()
  const form = useZodForm(workRecordCreateSchema, {
    defaultValues: { kind, title: "", ref: refOptions?.[0] ?? "", ownerName: "", date: addDays(today(), 7), amount: "" as never, description: "" },
  })
  const create = useApiMutation((v: unknown) => http.post<WorkRecord>("/records", v), {
    invalidate: [recordKeys.all],
    toastError: false,
    success: (r) => `${r.title} kaydı oluşturuldu.`,
    onSuccess: () => {
      form.reset()
      onClose()
    },
  })
  if (!open) return null
  return (
    <Modal open onClose={onClose} title={cfg.createLabel}>
      <Form form={form} onSubmit={(v) => create.mutate({ ...v, ownerName: v.ownerName || staff[0] }, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="title" label={cfg.titleLabel} autoFocus required />
          {refOptions ? (
            <FormSelect name="ref" label={cfg.refLabel} options={refOptions} />
          ) : (
            <FormInput name="ref" label={cfg.refLabel} optional />
          )}
          <FormGrid>
            <FormSelect name="ownerName" label={cfg.ownerLabel} options={staff} />
            <FormDate name="date" label={cfg.dateLabel.split(" /")[0]} />
          </FormGrid>
          {cfg.amountInput && <FormInput name="amount" label={`${cfg.amountLabel ?? "Tutar"} (₺)`} type="number" min={0} optional />}
          {cfg.upload && <UploadZone accept=".pdf,image/*" description="PDF, JPG veya PNG · en fazla 20 MB" />}
          <FormTextarea name="description" label="Açıklama" rows={3} />
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

const AUDIT_CHECKLIST = ["Dokümanlar güncel ve erişilebilir", "Sorumlular ve süreçler tanımlanmış", "Düzeltici faaliyetler doğrulanmış"]

/** Detail modal: info grid, optional audit checklist, timeline & approve. */
export function RecordDetailModal({ record, onClose, moduleName }: { record: WorkRecord | null; onClose: () => void; moduleName: string }) {
  const { canDo } = useAccess()
  const [rootCause, setRootCause] = useState<string | null>(null)
  const update = useApiMutation((v: Partial<WorkRecord>) => http.patch<WorkRecord>(`/records/${record!.id}`, v), { invalidate: [recordKeys.all] })
  const approve = useApiMutation(() => http.post<WorkRecord>(`/records/${record!.id}/approve`), {
    invalidate: [recordKeys.all],
    success: "Kayıt onaylandı ve işlem geçmişine eklendi.",
    onSuccess: onClose,
  })
  if (!record) return null
  const cfg = RECORD_KIND_CONFIG[record.kind]
  const editable = canDo(cfg.resource, "update")
  const checklist = update.data?.id === record.id ? (update.data.checklist ?? record.checklist) : record.checklist
  const done = ["Tamamlandı", "Onaylandı", "Yayında"].includes(record.status)
  return (
    <Modal open onClose={onClose} size="lg" title={record.title} subtitle={`${record.ref} · ${moduleName}`}>
      <ModalBody>
        <div className="flex justify-between text-xs">
          <StatusBadge status={record.status} />
          <span className="text-ink-subtle">{dateText(record)}</span>
        </div>
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: cfg.refLabel, value: record.ref },
            { label: cfg.ownerLabel, value: record.ownerName },
            { label: "Açıklama", value: record.description || record.subtitle },
            { label: cfg.amountLabel ?? "Versiyon", value: amountText(record) ?? "v1 · Güncel sürüm" },
          ]}
        />
        {cfg.checklist && (
          <>
            <h3 className="mt-2 mb-[15px] text-sm font-semibold-soft text-ink-heading">Denetim kontrol listesi</h3>
            <div className="flex flex-col gap-[15px]">
              {AUDIT_CHECKLIST.map((label, i) => (
                <Checkbox
                  key={label}
                  variant="task"
                  label={label}
                  checked={Boolean(checklist?.[i])}
                  disabled={!editable}
                  onChange={(e) => {
                    const next = AUDIT_CHECKLIST.map((_, j) => (j === i ? e.target.checked : Boolean(checklist?.[j])))
                    update.mutate({ checklist: next })
                  }}
                />
              ))}
            </div>
            <div className="mt-5">
              <label className="mb-2 block text-xs font-medium text-ink-label" htmlFor="root-cause">
                Kök neden & düzeltici faaliyet
              </label>
              <Textarea
                id="root-cause"
                rows={3}
                disabled={!editable}
                value={rootCause ?? record.rootCause ?? ""}
                onChange={(e) => setRootCause(e.target.value)}
                onBlur={() => rootCause !== null && update.mutate({ rootCause })}
                placeholder="Kök nedeni ve alınan önlemi yazın..."
              />
            </div>
          </>
        )}
        <EntityTimeline type="record" id={record.id} label={record.title} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
        {cfg.approveLabel && editable && !done && (
          <Button variant="primary" loading={approve.isPending} onClick={() => approve.mutate()}>
            {cfg.approveLabel}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
