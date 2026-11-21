"use client"

import { useState } from "react"
import {
  Button,
  CompanyAvatar,
  DataTable,
  DescriptionList,
  EmptyState,
  FormGrid,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  TableCellEntity,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { useCustomerOptions } from "@/entities/lookups"
import { TAB_KIND } from "@/entities/record/kinds"
import { RecordCreateModal, RecordDetailModal, RecordsTable } from "@/entities/record/RecordsPanel"
import { NewTripModal, type NewTripDefaults } from "@/entities/trip/NewTripModal"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import type { StatCard } from "@/shared/contracts/common"
import {
  customerCreateSchema,
  quoteCreateSchema,
  tariffCreateSchema,
  type Customer,
  type Quote,
  type Tariff,
} from "@/shared/contracts/commercial"
import type { WorkRecord } from "@/shared/contracts/resources"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, useZodForm } from "@/shared/forms"
import { addDays, today } from "@/shared/lib/clock"
import { exportCSV } from "@/shared/lib/csv"
import { formatDate, money } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import type { useListState } from "@/shared/ui/useListState"

type ListState = ReturnType<typeof useListState>
const CREATE_LABEL: Record<string, string> = {
  Müşteriler: "Müşteri ekle",
  Teklifler: "Teklif oluştur",
  Tarifeler: "Tarife ekle",
  "Görüşme notları": "Görüşme notu ekle",
}

export function CustomersScreen() {
  const { canDo } = useAccess()
  const [creating, setCreating] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [record, setRecord] = useState<WorkRecord | null>(null)
  const [tripDefaults, setTripDefaults] = useState<NewTripDefaults | null>(null)
  const stats = useApiQuery<StatCard[]>(["customers", "stats"], "/customers/stats")
  const customers = useCustomerOptions()
  const canCreate = (tab: string) => (tab === "Teklifler" || tab === "Tarifeler" ? canDo("quotes", "create") : canDo("customers", "create"))

  return (
    <>
      <ModuleWorkspace
        module="customers"
        stats={stats.data}
        actions={(tab) =>
          canCreate(tab) && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(tab)}>
              {CREATE_LABEL[tab]}
            </Button>
          )
        }
        onExport={(tab) =>
          tab === "Müşteriler" &&
          exportCSV(
            [["Müşteri", "Kod", "Sektör", "Yetkili", "Vade", "Ekim cirosu"], ...(customers.data?.items ?? []).map((c) => [c.name, c.code, c.sector, c.contactName, `${c.paymentTermDays} gün`, c.revenueLastMonth])],
            "seferhane-musteriler",
          )
        }
      >
        {(tab, list) =>
          tab === "Müşteriler" ? (
            <CustomerTable list={list} onOpen={setCustomer} />
          ) : tab === "Teklifler" ? (
            <QuoteTable list={list} onOpen={setQuote} />
          ) : tab === "Tarifeler" ? (
            <TariffTable list={list} />
          ) : (
            <RecordsTable kind={TAB_KIND[tab]} params={list.params} page={list.page} onPage={list.setPage} onOpen={setRecord} />
          )
        }
      </ModuleWorkspace>
      {creating === "Müşteriler" && <CustomerModal onClose={() => setCreating(null)} />}
      {creating === "Teklifler" && <QuoteModal onClose={() => setCreating(null)} />}
      {creating === "Tarifeler" && <TariffModal onClose={() => setCreating(null)} />}
      {creating === "Görüşme notları" && (
        <RecordCreateModal kind="customers.note" open onClose={() => setCreating(null)} refOptions={(customers.data?.items ?? []).map((c) => c.code)} />
      )}
      <CustomerDetail customer={customer} onClose={() => setCustomer(null)} />
      <QuoteDetail
        quote={quote}
        onClose={() => setQuote(null)}
        onConvert={(q) => {
          setQuote(null)
          setTripDefaults({ quoteId: q.id, customerId: q.customerId, from: q.from, to: q.to, revenue: q.price })
        }}
      />
      <RecordDetailModal record={record} onClose={() => setRecord(null)} moduleName="Müşteri & teklif" />
      <NewTripModal open={!!tripDefaults} onClose={() => setTripDefaults(null)} defaults={tripDefaults ?? undefined} />
    </>
  )
}

/* Tables ------------------------------------------------------------ */

function CustomerTable({ list, onOpen }: { list: ListState; onOpen: (c: Customer) => void }) {
  const { data } = useListQuery<Customer>(["customers"], "/customers", list.params)
  return (
    <DataTable<Customer>
      aria-label="Müşteriler"
      data={data?.items ?? []}
      getRowId={(c) => c.id}
      onRowClick={onOpen}
      selectable
      minWidth={640}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="müşteri" />}
      columns={[
        { key: "name", header: "Müşteri", sortValue: (c) => c.name, cell: (c, i) => <TableCellEntity leading={<CompanyAvatar name={c.name} colorIndex={(i % 5) as 0} />} title={c.name} subtitle={c.sector} /> },
        { key: "code", header: "Kod", cell: (c) => c.code },
        { key: "contact", header: "Yetkili", cell: (c) => c.contactName },
        { key: "terms", header: "Ödeme vadesi", hideOnMobile: true, cell: (c) => `${c.paymentTermDays} gün vade` },
        { key: "status", header: "Durum", cell: (c) => <StatusBadge status={c.status} /> },
        { key: "revenue", header: "Ciro · Ekim", sortValue: (c) => c.revenueLastMonth, cell: (c) => `${money(c.revenueLastMonth)} · ${c.tripsLastMonth} sefer` },
      ]}
    />
  )
}

function QuoteTable({ list, onOpen }: { list: ListState; onOpen: (q: Quote) => void }) {
  const { data } = useListQuery<Quote>(["quotes"], "/quotes", list.params)
  return (
    <DataTable<Quote>
      aria-label="Teklifler"
      data={data?.items ?? []}
      getRowId={(q) => q.id}
      onRowClick={onOpen}
      minWidth={640}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="teklif" />}
      columns={[
        { key: "number", header: "Teklif", sortValue: (q) => q.number, cell: (q) => <TableCellEntity title={`${q.customerName} · ${q.from} → ${q.to}`} subtitle={q.details} /> },
        { key: "ref", header: "Referans", cell: (q) => q.number },
        { key: "owner", header: "Hazırlayan", hideOnMobile: true, cell: (q) => q.ownerName },
        { key: "validUntil", header: "Geçerlilik", sortValue: (q) => q.validUntil, cell: (q) => formatDate(q.validUntil) },
        { key: "status", header: "Durum", cell: (q) => <StatusBadge status={q.status} /> },
        { key: "price", header: "Tutar", sortValue: (q) => q.price, cell: (q) => `${money(q.price)} / sefer` },
      ]}
    />
  )
}

function TariffTable({ list }: { list: ListState }) {
  const { data } = useListQuery<Tariff>(["tariffs"], "/tariffs", list.params)
  return (
    <DataTable<Tariff>
      aria-label="Tarifeler"
      data={data?.items ?? []}
      getRowId={(t) => t.id}
      minWidth={640}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="tarife" />}
      columns={[
        { key: "route", header: "Hat", cell: (t) => <TableCellEntity title={`${t.from} → ${t.to} · ${t.vehicleType}`} subtitle={`${t.customerName} · ${t.weightRange}`} /> },
        { key: "code", header: "Kod", cell: (t) => t.code },
        { key: "validUntil", header: "Geçerlilik", sortValue: (t) => t.validUntil, cell: (t) => formatDate(t.validUntil) },
        { key: "status", header: "Durum", cell: (t) => <StatusBadge status={t.status} /> },
        { key: "price", header: "Birim fiyat", sortValue: (t) => t.price, cell: (t) => `${money(t.price)} / sefer` },
      ]}
    />
  )
}

/* Modals ------------------------------------------------------------ */

function CustomerModal({ onClose }: { onClose: () => void }) {
  const form = useZodForm(customerCreateSchema, {
    defaultValues: { name: "", sector: "", taxNumber: "", contactName: "", contactEmail: "", contactPhone: "", paymentTermDays: 30 },
  })
  const create = useApiMutation((v: unknown) => http.post<Customer>("/customers", v), {
    invalidate: [["customers"]],
    toastError: false,
    success: (c) => `${c.name} kaydı oluşturuldu.`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Müşteri ekle" subtitle="Müşteri & teklif · Müşteri kartı">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="name" label="Firma adı" autoFocus required />
          <FormGrid>
            <FormInput name="sector" label="Sektör" placeholder="Üretim · Beyaz eşya" />
            <FormInput name="taxNumber" label="Vergi numarası" optional />
          </FormGrid>
          <FormGrid>
            <FormInput name="contactName" label="Yetkili" required />
            <FormInput name="contactEmail" label="Yetkili e-posta" type="email" optional />
          </FormGrid>
          <FormGrid>
            <FormInput name="contactPhone" label="Telefon" optional />
            <FormInput name="paymentTermDays" label="Ödeme vadesi (gün)" type="number" min={0} max={180} />
          </FormGrid>
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

function QuoteModal({ onClose }: { onClose: () => void }) {
  const customers = useCustomerOptions()
  const form = useZodForm(quoteCreateSchema, {
    defaultValues: { customerName: "", from: "", to: "", details: "", validUntil: addDays(today(), 14), price: "" as never, paymentTermDays: 30 },
  })
  const create = useApiMutation((v: unknown) => http.post<Quote>("/quotes", v), {
    invalidate: [["quotes"], ["customers"]],
    toastError: false,
    success: (q) => `${q.number} teklifi oluşturuldu.`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Teklif oluştur" subtitle="Müşteri & teklif · Faz 2">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="customerName" label="Müşteri" list="quote-customers" autoFocus required />
          <datalist id="quote-customers">
            {customers.data?.items.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <FormGrid>
            <FormInput name="from" label="Çıkış" />
            <FormInput name="to" label="Varış" />
          </FormGrid>
          <FormInput name="details" label="Detay" placeholder="24 ton · Tenteli · 10 sefer / ay" />
          <FormGrid>
            <FormInput name="price" label="Teklif tutarı (₺)" type="number" min={1} required />
            <FormInput name="paymentTermDays" label="Vade (gün)" type="number" min={0} />
          </FormGrid>
          <FormDate name="validUntil" label="Geçerlilik tarihi" min={today()} />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Teklifi oluştur
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

function TariffModal({ onClose }: { onClose: () => void }) {
  const form = useZodForm(tariffCreateSchema, {
    defaultValues: { customerName: "", from: "", to: "", vehicleType: "Tenteli", weightRange: "0–24 ton", validUntil: "2026-12-31", price: "" as never },
  })
  const create = useApiMutation((v: unknown) => http.post<Tariff>("/tariffs", v), {
    invalidate: [["tariffs"]],
    toastError: false,
    success: "Tarife eklendi.",
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Tarife ekle" subtitle="Hat · araç tipi · tonaj bazlı birim fiyat">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="customerName" label="Müşteri" autoFocus required />
          <FormGrid>
            <FormInput name="from" label="Çıkış" />
            <FormInput name="to" label="Varış" />
          </FormGrid>
          <FormGrid>
            <FormSelect name="vehicleType" label="Araç tipi" options={["Tenteli", "Açık kasa", "Frigo", "Frigo parsiyel", "Kamyon"]} />
            <FormInput name="weightRange" label="Tonaj aralığı" />
          </FormGrid>
          <FormGrid>
            <FormInput name="price" label="Birim fiyat (₺ / sefer)" type="number" min={1} required />
            <FormDate name="validUntil" label="Geçerlilik" min={today()} />
          </FormGrid>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Tarifeyi ekle
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

function CustomerDetail({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  if (!customer) return null
  return (
    <Modal open onClose={onClose} size="lg" title={customer.name} subtitle={`${customer.code} · Müşteri & teklif`}>
      <ModalBody>
        <StatusBadge status={customer.status} />
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "Sektör", value: customer.sector },
            { label: "Yetkili", value: `${customer.contactName}${customer.contactEmail ? ` · ${customer.contactEmail}` : ""}` },
            { label: "Ödeme vadesi", value: `${customer.paymentTermDays} gün` },
            { label: "Ekim 2026", value: `${customer.tripsLastMonth} sefer · ${money(customer.revenueLastMonth)}` },
          ]}
        />
        <EntityTimeline type="customer" id={customer.id} label={customer.name} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
      </ModalFooter>
    </Modal>
  )
}

function QuoteDetail({ quote, onClose, onConvert }: { quote: Quote | null; onClose: () => void; onConvert: (q: Quote) => void }) {
  const { canDo } = useAccess()
  const accept = useApiMutation(() => http.post<Quote>(`/quotes/${quote!.id}/accept`), {
    invalidate: [["quotes"], ["customers"]],
    success: "Teklif onaylandı. Sefer bilgileri hazırlandı.",
    onSuccess: (q) => onConvert(q),
  })
  const reject = useApiMutation(() => http.post<Quote>(`/quotes/${quote!.id}/reject`), {
    invalidate: [["quotes"], ["customers"]],
    success: "Teklif reddedildi.",
    onSuccess: onClose,
  })
  if (!quote) return null
  const open = quote.status === "Onay bekliyor" || quote.status === "Taslak"
  return (
    <Modal open onClose={onClose} size="lg" title={`${quote.customerName} · ${quote.from} → ${quote.to}`} subtitle={`${quote.number} · Müşteri & teklif`}>
      <ModalBody>
        <div className="flex justify-between text-xs">
          <StatusBadge status={quote.status} />
          <span className="text-ink-subtle">{formatDate(quote.validUntil)} geçerlilik</span>
        </div>
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "Detay", value: quote.details },
            { label: "Hazırlayan", value: quote.ownerName },
            { label: "Tutar", value: `${money(quote.price)} / sefer + KDV` },
            { label: "Bağlı sefer", value: quote.tripId ? "Sefere dönüştü" : "—" },
          ]}
        />
        <EntityTimeline type="quote" id={quote.id} label={quote.number} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
        {canDo("quotes", "approve") && open && (
          <Button variant="danger" loading={reject.isPending} onClick={() => reject.mutate()}>
            Reddet
          </Button>
        )}
        {canDo("quotes", "approve") && canDo("trips", "create") && (open || quote.status === "Kabul edildi") && (
          <Button
            variant="primary"
            loading={accept.isPending}
            onClick={() => (quote.status === "Kabul edildi" ? onConvert(quote) : accept.mutate())}
          >
            Onayla & sefere dönüştür
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}

