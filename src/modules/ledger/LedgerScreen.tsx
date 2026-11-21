"use client"

import { useState } from "react"
import {
  Alert,
  Badge,
  Button,
  Card,
  CompanyAvatar,
  DataTable,
  DescriptionList,
  EmptyState,
  FormGrid,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  SearchInput,
  StatGroup,
  Tabs,
  TableCellEntity,
  Toolbar,
} from "@/design-system"
import { ModulePage } from "@/app-shell/ModulePage"
import { useAccess } from "@/app-shell/session"
import { moduleById } from "@/modules/registry"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import {
  LEDGER_DIRECTIONS,
  ledgerAmountSchema,
  ledgerCreateSchema,
  ledgerPaymentSchema,
  type LedgerEntryView,
  type LedgerSummary,
} from "@/shared/contracts/commercial"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, useZodForm } from "@/shared/forms"
import { addDays, today } from "@/shared/lib/clock"
import { formatDate, formatDateNumeric, money } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import { useListState } from "@/shared/ui/useListState"

const KEY = ["ledger"]
const TABS = moduleById("ledger")!.tabs!

export function LedgerScreen() {
  const { canDo, me } = useAccess()
  const list = useListState({ tab: TABS[0], pageSize: 25 })
  const [creating, setCreating] = useState<{ party?: string; direction?: "Alacak" | "Borç" } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const summary = useApiQuery<LedgerSummary & { parties: string[] }>([...KEY, "summary"], "/ledger/summary")
  const { data } = useListQuery<LedgerEntryView>(KEY, "/ledger", { ...list.params, tab: list.tab === TABS[0] ? undefined : list.tab })
  const s = summary.data

  return (
    <ModulePage module="ledger">
      {s && (
        <div className="mb-[25px]">
          <StatGroup
            items={[
              { label: "Toplam alacağımız", value: money(s.receivable), caption: "Cari bize borçlu", tone: "positive" },
              { label: "Toplam borcumuz", value: money(s.payable), caption: "Biz cariye borçluyuz", tone: "warning" },
              { label: "Net cari durum", value: money(Math.abs(s.net)), caption: s.net >= 0 ? "Alacak lehine" : "Borç lehine" },
              { label: "Vadesi gelen", value: String(s.due.length), caption: "Tamamı ödenmemiş kayıt" },
            ]}
          />
        </div>
      )}
      {!!s?.due.length && (
        <div className="mb-[25px]">
          <Alert
            tone="error"
            title={`${s.due.length} cari kaydın vadesi geldi, henüz tamamen ödenmedi.`}
            action={
              <Button variant="link" onClick={() => list.setTab("Vadesi gelenler")}>
                Göster
              </Button>
            }
          >
            {s.due
              .map((e) => `${e.party} · ${e.direction === "Alacak" ? "tahsil edilecek" : "ödenecek"} ${money(e.remaining)} (${formatDateNumeric(e.dueDate)})`)
              .join(" · ")}
          </Alert>
        </div>
      )}
      <Card
        title="Cari kayıtlar"
        action={
          canDo("ledger", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating({})}>
              Borç / alacak ekle
            </Button>
          )
        }
      >
        <div className="mt-3">
          <Tabs variant="panel" items={TABS} value={list.tab} onChange={list.setTab} aria-label="Cari sekmeleri" />
        </div>
        <Toolbar start={<SearchInput value={list.q} onValueChange={list.setQ} placeholder="Cari, açıklama veya kayıt no ara..." />} />
        <DataTable<LedgerEntryView>
          aria-label="Cari kayıtlar"
          data={data?.items ?? []}
          getRowId={(e) => e.id}
          onRowClick={(e) => setSelected(e.id)}
          minWidth={760}
          sort={list.tableSort}
          onSortChange={list.onTableSort}
          empty={<EmptyState title="Kayıt bulunamadı" />}
          footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} />}
          columns={[
            {
              key: "party",
              header: "Cari / Açıklama",
              sortValue: (e) => e.party,
              cell: (e, i) => <TableCellEntity leading={<CompanyAvatar name={e.party} colorIndex={(i % 5) as 0} />} title={e.party} subtitle={`${e.number} · ${e.description}`} />,
            },
            {
              key: "direction",
              header: "Yön",
              cell: (e) => <Badge tone={e.direction === "Alacak" ? "green" : "amber"}>{e.direction === "Alacak" ? "Alacak · bize borçlu" : "Borç · biz borçluyuz"}</Badge>,
            },
            { key: "amount", header: "Toplam", align: "right", sortValue: (e) => e.amount, cell: (e) => money(e.amount) },
            { key: "paid", header: "Ödenen", align: "right", cell: (e) => money(e.paid) },
            { key: "remaining", header: "Kalan", align: "right", sortValue: (e) => e.remaining, cell: (e) => <strong>{money(e.remaining)}</strong> },
            { key: "dueDate", header: "Vade", sortValue: (e) => e.dueDate, cell: (e) => formatDate(e.dueDate) },
            { key: "status", header: "Durum", cell: (e) => <StatusBadge status={e.status} /> },
          ]}
        />
      </Card>
      {creating && <LedgerCreateModal defaults={creating} parties={s?.parties ?? []} onClose={() => setCreating(null)} />}
      {selected && (
        <LedgerDetail
          id={selected}
          companyName={me?.tenant?.name ?? "Şirket"}
          onClose={() => setSelected(null)}
          onNewForParty={(party, direction) => {
            setSelected(null)
            setCreating({ party, direction })
          }}
        />
      )}
    </ModulePage>
  )
}

function LedgerCreateModal({ defaults, parties, onClose }: { defaults: { party?: string; direction?: "Alacak" | "Borç" }; parties: string[]; onClose: () => void }) {
  const form = useZodForm(ledgerCreateSchema, {
    defaultValues: { party: defaults.party ?? "", direction: defaults.direction ?? "Alacak", amount: "" as never, dueDate: addDays(today(), 30), description: "" },
  })
  const create = useApiMutation((v: unknown) => http.post<LedgerEntryView>("/ledger", v), {
    invalidate: [KEY],
    toastError: false,
    success: (e) => `${e.party} için ${money(e.amount)} ${e.direction.toLocaleLowerCase("tr")} kaydı eklendi. Vade: ${formatDateNumeric(e.dueDate)}.`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Borç / alacak kaydı ekle" subtitle="Cari hesaba elle kayıt">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="party" label="Cari (firma / kişi)" list="ledger-parties" autoFocus required />
          <datalist id="ledger-parties">
            {parties.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <FormSelect
            name="direction"
            label="Kimin kime borcu var?"
            options={LEDGER_DIRECTIONS.map((d) => ({ value: d, label: d === "Alacak" ? "Alacak · cari bize borçlu" : "Borç · biz cariye borçluyuz" }))}
          />
          <FormGrid>
            <FormInput name="amount" label="Tutar (₺)" type="number" min={1} required />
            <FormDate name="dueDate" label="Tahsil / ödeme tarihi (vade)" required />
          </FormGrid>
          <FormInput name="description" label="Açıklama" optional placeholder="Cari kayıt" />
          <Alert tone="info" title="Vade uyarıları otomatik">
            Vadesi gelen ve tamamı ödenmemiş kayıtlar menüde rozet, ekranda uyarı bandı ve bildirim olarak görünür.
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Kaydı ekle
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

function LedgerDetail({
  id,
  companyName,
  onClose,
  onNewForParty,
}: {
  id: string
  companyName: string
  onClose: () => void
  onNewForParty: (party: string, direction: "Alacak" | "Borç") => void
}) {
  const { canDo } = useAccess()
  const { data: e } = useApiQuery<LedgerEntryView>([...KEY, "detail", id], `/ledger/${id}`)
  const payForm = useZodForm(ledgerPaymentSchema, { defaultValues: { amount: "" as never, date: today() } })
  const amountForm = useZodForm(ledgerAmountSchema, { defaultValues: { amount: "" as never } })
  const pay = useApiMutation((v: unknown) => http.post<LedgerEntryView>(`/ledger/${id}/payments`, v), {
    invalidate: [KEY],
    toastError: false,
    success: (r) => `Ödeme kaydedildi. Kalan: ${money(r.remaining)}.`,
    onSuccess: () => payForm.reset({ amount: "" as never, date: today() }),
  })
  const updateAmount = useApiMutation((v: unknown) => http.patch<LedgerEntryView>(`/ledger/${id}`, v), {
    invalidate: [KEY],
    toastError: false,
    success: (r) => `Kayıt tutarı ${money(r.amount)} olarak güncellendi.`,
    onSuccess: () => amountForm.reset({ amount: "" as never }),
  })
  const settle = useApiMutation(() => http.post<LedgerEntryView>(`/ledger/${id}/settle`), {
    invalidate: [KEY],
    success: (r) => `${r.party} kaydı tamamen ödendi olarak işaretlendi; vade uyarısı kapandı.`,
  })
  if (!e) return null
  const closed = e.status === "Kapandı"
  const editable = canDo("ledger", "update") && !closed
  return (
    <Modal open onClose={onClose} size="lg" title={`${e.party} · ${e.direction}`} subtitle={`${e.number} · ${e.description}`}>
      <ModalBody>
        <div className="flex justify-between text-xs">
          <StatusBadge status={e.status} />
          <span className="text-ink-subtle">Vade: {formatDate(e.dueDate)}</span>
        </div>
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "Kimin kime borcu var", value: e.direction === "Alacak" ? `${e.party} → ${companyName}` : `${companyName} → ${e.party}` },
            { label: "Toplam tutar", value: money(e.amount) },
            { label: "Ödenen", value: money(e.paid), tone: "positive" },
            { label: "Kalan", value: money(e.remaining), tone: e.remaining ? "warning" : "positive" },
          ]}
        />
        <h3 className="mb-2 text-sm font-semibold-soft text-ink-heading">Ödeme geçmişi</h3>
        {e.payments.length ? (
          e.payments.map((p) => <ListItem key={p.id} variant="simple" title={money(p.amount)} description={p.note} trailing={formatDateNumeric(p.date)} />)
        ) : (
          <p className="py-3 text-2xs text-ink-subtle">Henüz ödeme girilmedi.</p>
        )}
        {editable && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Form form={payForm} onSubmit={(v) => pay.mutate(v, { onError: (err) => applyServerErrors(payForm as never, err) })}>
              <h3 className="mb-3 text-sm font-semibold-soft text-ink-heading">Parçalı ödeme ekle</h3>
              <FormInput name="amount" label="Ödenen tutar (₺)" type="number" min={1} max={e.remaining} />
              <FormDate name="date" label="Ödeme tarihi" />
              <Button type="submit" variant="primary" loading={pay.isPending}>
                Ödemeyi kaydet
              </Button>
            </Form>
            <Form form={amountForm} onSubmit={(v) => updateAmount.mutate(v, { onError: (err) => applyServerErrors(amountForm as never, err) })}>
              <h3 className="mb-3 text-sm font-semibold-soft text-ink-heading">Borç tutarını güncelle</h3>
              <FormInput name="amount" label="Yeni toplam tutar (₺)" type="number" min={1} placeholder={String(e.amount)} />
              <Button type="submit" loading={updateAmount.isPending}>
                Tutarı güncelle
              </Button>
            </Form>
          </div>
        )}
        <EntityTimeline type="ledger" id={e.id} label={e.number} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
        {canDo("ledger", "create") && <Button onClick={() => onNewForParty(e.party, e.direction)}>Aynı cariye yeni kayıt</Button>}
        {editable && (
          <Button variant="primary" loading={settle.isPending} onClick={() => settle.mutate()}>
            Tamamı ödendi
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
