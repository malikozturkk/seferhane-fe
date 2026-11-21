"use client"

import { useState } from "react"
import {
  Alert,
  Avatar,
  Button,
  DataTable,
  DescriptionList,
  EmptyState,
  FormGrid,
  HorizontalBarChart,
  IconTile,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  ShieldAlertIcon,
  TableCellEntity,
  UploadZone,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { useStaffNames } from "@/entities/lookups"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import type { StatCard } from "@/shared/contracts/common"
import { CLAIM_KINDS, claimCreateSchema, type ClaimView } from "@/shared/contracts/management"
import { applyServerErrors, Form, FormInput, FormSelect, FormTextarea, useZodForm } from "@/shared/forms"
import { exportCSV } from "@/shared/lib/csv"
import { formatDateTime, money } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import type { useListState } from "@/shared/ui/useListState"

const KEY = ["claims"]

export function ClaimsScreen() {
  const { canDo } = useAccess()
  const [creating, setCreating] = useState(false)
  const [claim, setClaim] = useState<ClaimView | null>(null)
  const stats = useApiQuery<StatCard[]>([...KEY, "stats"], "/claims/stats")
  const all = useListQuery<ClaimView>(KEY, "/claims", { pageSize: 500 })

  return (
    <>
      <ModuleWorkspace
        module="claims"
        stats={stats.data}
        bareTabs={["Hasar analizi"]}
        actions={() =>
          canDo("claims", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(true)}>
              Dosya aç
            </Button>
          )
        }
        onExport={() =>
          exportCSV(
            [["Dosya", "Tür", "İlişkili", "Tutar", "Durum"], ...(all.data?.items ?? []).map((c) => [c.number, c.kind, c.relatedRef, c.amount, c.status])],
            "seferhane-hasar",
          )
        }
      >
        {(tab, list) => (tab === "Hasar analizi" ? <Analysis /> : <ClaimTable tab={tab} list={list} onOpen={setClaim} />)}
      </ModuleWorkspace>
      {creating && <ClaimModal onClose={() => setCreating(false)} />}
      {claim && <ClaimDetail claim={claim} onClose={() => setClaim(null)} />}
    </>
  )
}

function Analysis() {
  const { data } = useApiQuery<Array<{ label: string; value: number }>>([...KEY, "analysis"], "/claims/analysis")
  return (
    <div className="p-[30px]">
      <h3 className="mb-6 text-md font-semibold text-ink-heading">Hasar türüne göre dağılım</h3>
      {data && <HorizontalBarChart aria-label="Hasar türleri" data={data} />}
    </div>
  )
}

function ClaimTable({ tab, list, onOpen }: { tab: string; list: ReturnType<typeof useListState>; onOpen: (c: ClaimView) => void }) {
  const { data } = useListQuery<ClaimView>(KEY, "/claims", { ...list.params, tab })
  return (
    <DataTable<ClaimView>
      aria-label="Hasar dosyaları"
      data={data?.items ?? []}
      getRowId={(c) => c.id}
      onRowClick={onOpen}
      selectable
      minWidth={680}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState title="Dosya bulunamadı" description={tab === "Kapanan dosyalar" ? "Henüz kapanan dosya yok." : undefined} />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="dosya" />}
      columns={[
        {
          key: "title",
          header: "Dosya",
          sortValue: (c) => c.title,
          cell: (c) => <TableCellEntity leading={<IconTile tone="orange" size="sm" icon={<ShieldAlertIcon size={16} />} />} title={c.title} subtitle={`${c.kind} · ${c.description}`} />,
        },
        { key: "ref", header: "İlişkili kayıt", cell: (c) => c.relatedRef },
        {
          key: "owner",
          header: "Sorumlu",
          hideOnMobile: true,
          cell: (c) => (
            <span className="flex items-center gap-[7px]">
              <Avatar name={c.ownerName} size="sm" />
              {c.ownerName}
            </span>
          ),
        },
        { key: "sla", header: "SLA", sortValue: (c) => c.slaDueAt, cell: (c) => c.slaLabel },
        { key: "status", header: "Durum", cell: (c) => <StatusBadge status={c.status} /> },
        { key: "amount", header: "Tutar", sortValue: (c) => c.amount, cell: (c) => <strong>{money(c.amount)}</strong> },
      ]}
    />
  )
}

function ClaimModal({ onClose }: { onClose: () => void }) {
  const staff = useStaffNames()
  const form = useZodForm(claimCreateSchema, {
    defaultValues: { title: "", kind: "Yük hasarı", relatedRef: "", ownerName: "", amount: 0, description: "" },
  })
  const create = useApiMutation((v: unknown) => http.post<ClaimView>("/claims", v), {
    invalidate: [KEY],
    toastError: false,
    success: (c) => `${c.number} dosyası açıldı. İlk yanıt SLA: 24 saat.`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Dosya aç" subtitle="Hasar & şikâyet · MVP">
      <Form form={form} onSubmit={(v) => create.mutate({ ...v, ownerName: v.ownerName || staff[0] }, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="title" label="Dosya başlığı" placeholder="Ambalaj hasarı · 3 palet" autoFocus required />
          <FormGrid>
            <FormSelect name="kind" label="Tür" options={[...CLAIM_KINDS]} />
            <FormInput name="relatedRef" label="İlişkili kayıt" placeholder="SFR-2026-0842 / plaka" />
          </FormGrid>
          <FormGrid>
            <FormSelect name="ownerName" label="Sorumlu" options={staff} />
            <FormInput name="amount" label="Tahmini tutar (₺)" type="number" min={0} />
          </FormGrid>
          <UploadZone accept=".pdf,image/*" multiple description="Fotoğraf, tutanak, taşıma belgesi · WhatsApp'tan gelen fotoğraflar" />
          <FormTextarea name="description" label="Açıklama" rows={3} />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Dosyayı aç
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

function ClaimDetail({ claim, onClose }: { claim: ClaimView; onClose: () => void }) {
  const { canDo } = useAccess()
  const update = useApiMutation((status: ClaimView["status"]) => http.patch<ClaimView>(`/claims/${claim.id}`, { status }), {
    invalidate: [KEY],
    success: (c) => (c.status === "Tamamlandı" ? "Dosya kapatıldı. Kapanış işlem geçmişine eklendi." : `Dosya durumu: ${c.status}`),
    onSuccess: onClose,
  })
  const editable = canDo("claims", "update")
  return (
    <Modal open onClose={onClose} size="lg" title={claim.title} subtitle={`${claim.number} · Hasar & şikâyet`}>
      <ModalBody>
        <div className="flex justify-between text-xs">
          <StatusBadge status={claim.status} />
          <span className="text-ink-subtle">{claim.slaLabel}</span>
        </div>
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "Tür", value: claim.kind },
            { label: "İlişkili kayıt", value: claim.relatedRef },
            { label: "Sorumlu", value: claim.ownerName },
            { label: "Tahmini tutar", value: money(claim.amount) },
            { label: "Kaynak", value: claim.source === "Portal" ? "Müşteri portalı" : "Panel" },
            { label: "Açılış", value: formatDateTime(claim.createdAt) },
          ]}
        />
        <Alert tone="warning" title="İlk yanıt SLA: 24 saat">
          {claim.insuranceNumber ? `Sigorta dosyası ${claim.insuranceNumber}. ` : ""}Gerekli belgeler: fotoğraf, tutanak, taşıma belgesi.
        </Alert>
        <EntityTimeline type="claim" id={claim.id} label={claim.number} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
        {editable && claim.status === "Yanıt bekliyor" && (
          <Button loading={update.isPending} onClick={() => update.mutate("İncelemede")}>
            İncelemeye al
          </Button>
        )}
        {canDo("claims", "approve") && claim.status !== "Tamamlandı" && (
          <Button variant="primary" loading={update.isPending} onClick={() => update.mutate("Tamamlandı")}>
            Dosyayı kapat
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}

