"use client"

import { useState } from "react"
import {
  Alert,
  Button,
  DataTable,
  DescriptionList,
  EmptyState,
  FormGrid,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  ReceiptTextIcon,
  TableCellEntity,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { useCustomerOptions } from "@/entities/lookups"
import { RecordDetailModal, RecordsTable } from "@/entities/record/RecordsPanel"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import type { StatCard } from "@/shared/contracts/common"
import { invoiceCreateSchema, type InvoiceDraft, type ReceivableView } from "@/shared/contracts/commercial"
import type { WorkRecord } from "@/shared/contracts/resources"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, useZodForm } from "@/shared/forms"
import { today } from "@/shared/lib/clock"
import { exportCSV } from "@/shared/lib/csv"
import { formatDate, money } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import type { useListState } from "@/shared/ui/useListState"

type ListState = ReturnType<typeof useListState>
const KEYS = [["invoices"], ["receivables"], ["records"]]

export function InvoicesScreen() {
  const { canDo } = useAccess()
  const [creating, setCreating] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceDraft | null>(null)
  const [receivable, setReceivable] = useState<ReceivableView | null>(null)
  const [record, setRecord] = useState<WorkRecord | null>(null)
  const stats = useApiQuery<StatCard[]>(["invoices", "stats"], "/invoices/stats")
  const all = useListQuery<InvoiceDraft>(["invoices"], "/invoices", { pageSize: 500 })

  return (
    <>
      <ModuleWorkspace
        module="invoices"
        stats={stats.data}
        actions={(tab) =>
          tab === "Fatura hazırlığı" &&
          canDo("invoices", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(true)}>
              Hazırlık dosyası oluştur
            </Button>
          )
        }
        onExport={() =>
          exportCSV(
            [["Dosya", "Müşteri", "Dönem", "Tutar", "Durum"], ...(all.data?.items ?? []).map((i) => [i.number, i.customerName, i.period, i.amount, i.status])],
            "seferhane-fatura-hazirligi",
          )
        }
        below={() => (
          <div className="mt-[22px]">
            <Alert tone="info" icon={<ReceiptTextIcon size={20} />} title="Seferhane fatura hazırlığını yapar; fatura kesmez.">
              Evrakı tamamlanan seferler müşteri bazında fatura kalemlerine dönüşür ve ERP&apos;ye Excel/XML olarak aktarılır.
            </Alert>
          </div>
        )}
      >
        {(tab, list) =>
          tab === "Fatura hazırlığı" ? (
            <InvoiceTable list={list} onOpen={setInvoice} />
          ) : tab === "Tahsilat takibi" ? (
            <ReceivableTable list={list} onOpen={setReceivable} />
          ) : (
            <RecordsTable kind="invoices.erpExport" params={list.params} page={list.page} onPage={list.setPage} onOpen={setRecord} />
          )
        }
      </ModuleWorkspace>
      {creating && <InvoiceModal onClose={() => setCreating(false)} />}
      <InvoiceDetail invoice={invoice} onClose={() => setInvoice(null)} />
      <ReceivableDetail receivable={receivable} onClose={() => setReceivable(null)} />
      <RecordDetailModal record={record} onClose={() => setRecord(null)} moduleName="Fatura & tahsilat" />
    </>
  )
}

function InvoiceTable({ list, onOpen }: { list: ListState; onOpen: (i: InvoiceDraft) => void }) {
  const { data } = useListQuery<InvoiceDraft>(["invoices"], "/invoices", list.params)
  return (
    <DataTable<InvoiceDraft>
      aria-label="Fatura hazırlığı"
      data={data?.items ?? []}
      getRowId={(i) => i.id}
      onRowClick={onOpen}
      selectable
      minWidth={640}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="dosya" />}
      columns={[
        { key: "name", header: "Kayıt / Açıklama", cell: (i) => <TableCellEntity title={`${i.customerName} · ${i.id.startsWith("auto_") ? i.number : i.period}`} subtitle={i.id.startsWith("auto_") ? i.period : `${i.tripCount} sefer · ${i.documentCount} belge`} /> },
        { key: "ref", header: "İlişkili kayıt", cell: (i) => i.number },
        { key: "owner", header: "Sorumlu", hideOnMobile: true, cell: (i) => i.ownerName },
        { key: "date", header: "Tarih", sortValue: (i) => i.date, cell: (i) => formatDate(i.date) },
        { key: "status", header: "Durum", cell: (i) => <StatusBadge status={i.status} /> },
        { key: "amount", header: "Tutar", sortValue: (i) => i.amount, cell: (i) => <strong>{money(i.amount)}</strong> },
      ]}
    />
  )
}

function ReceivableTable({ list, onOpen }: { list: ListState; onOpen: (r: ReceivableView) => void }) {
  const { data } = useListQuery<ReceivableView>(["receivables"], "/receivables", list.params)
  return (
    <DataTable<ReceivableView>
      aria-label="Tahsilat takibi"
      data={data?.items ?? []}
      getRowId={(r) => r.id}
      onRowClick={onOpen}
      minWidth={640}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="fatura" />}
      columns={[
        { key: "title", header: "Fatura", cell: (r) => <TableCellEntity title={r.title} subtitle={`ERP fatura no: ${r.erpNumber}`} /> },
        { key: "ref", header: "Hazırlık dosyası", cell: (r) => r.invoiceNumber },
        { key: "dueDate", header: "Vade", sortValue: (r) => r.dueDate, cell: (r) => formatDate(r.dueDate) },
        { key: "status", header: "Durum", cell: (r) => <StatusBadge status={r.status} /> },
        { key: "amount", header: "Tutar", sortValue: (r) => r.amount, cell: (r) => <strong>{money(r.amount)}</strong> },
      ]}
    />
  )
}

function InvoiceModal({ onClose }: { onClose: () => void }) {
  const customers = useCustomerOptions()
  const form = useZodForm(invoiceCreateSchema, { defaultValues: { customerName: "", period: "Kasım 2026", amount: "" as never, date: today() } })
  const create = useApiMutation((v: unknown) => http.post<InvoiceDraft>("/invoices", v), {
    invalidate: KEYS,
    toastError: false,
    success: (i) => `${i.number} hazırlık dosyası oluşturuldu.`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Hazırlık dosyası oluştur" subtitle="Fatura & tahsilat · Faz 2">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormSelect name="customerName" label="Müşteri" placeholder="Müşteri seçin" options={(customers.data?.items ?? []).map((c) => c.name)} />
          <FormGrid>
            <FormInput name="period" label="Dönem" />
            <FormDate name="date" label="Tarih" />
          </FormGrid>
          <FormInput name="amount" label="Tutar (₺)" type="number" min={1} required />
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

function InvoiceDetail({ invoice, onClose }: { invoice: InvoiceDraft | null; onClose: () => void }) {
  const { canDo } = useAccess()
  const advance = useApiMutation(() => http.post<InvoiceDraft>(`/invoices/${invoice!.id}/advance`), {
    invalidate: KEYS,
    success: (i) => (i.status === "ERP’ye aktarıldı" ? "Fatura kalemleri ERP aktarımı için gönderildi." : "Fatura kalemleri ERP aktarımı için hazırlandı."),
    onSuccess: onClose,
  })
  if (!invoice) return null
  return (
    <Modal open onClose={onClose} size="lg" title={`${invoice.customerName} · ${invoice.period}`} subtitle={`${invoice.number} · Fatura & tahsilat`}>
      <ModalBody>
        <StatusBadge status={invoice.status} />
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "Sefer / belge", value: `${invoice.tripCount} sefer · ${invoice.documentCount} belge` },
            { label: "Sorumlu", value: invoice.ownerName },
            { label: "Tarih", value: formatDate(invoice.date) },
            { label: "Tutar", value: money(invoice.amount) },
          ]}
        />
        {!invoice.id.startsWith("auto_") && <EntityTimeline type="invoice" id={invoice.id} label={invoice.number} />}
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
        {canDo("invoices", "approve") && invoice.status !== "ERP’ye aktarıldı" && (
          <Button variant="primary" loading={advance.isPending} onClick={() => advance.mutate()}>
            {invoice.status === "Evrak bekliyor" ? "Aktarıma hazırla" : "ERP’ye aktar"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}

function ReceivableDetail({ receivable, onClose }: { receivable: ReceivableView | null; onClose: () => void }) {
  const { canDo } = useAccess()
  const collect = useApiMutation(() => http.post(`/receivables/${receivable!.id}/collect`), {
    invalidate: KEYS,
    success: "Tahsilat kaydedildi.",
    onSuccess: onClose,
  })
  if (!receivable) return null
  return (
    <Modal open onClose={onClose} title={receivable.title} subtitle={`${receivable.invoiceNumber} · Tahsilat takibi`}>
      <ModalBody>
        <StatusBadge status={receivable.status} />
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "ERP fatura no", value: receivable.erpNumber },
            { label: "Vade", value: formatDate(receivable.dueDate) },
            { label: "Tutar", value: money(receivable.amount) },
            { label: "Sorumlu", value: receivable.ownerName },
          ]}
        />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
        {canDo("invoices", "approve") && !receivable.collected && (
          <Button variant="primary" loading={collect.isPending} onClick={() => collect.mutate()}>
            Tahsil edildi
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
