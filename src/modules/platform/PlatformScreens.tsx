"use client"

import { useState } from "react"
import { useWatch } from "react-hook-form"
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  EmptyState,
  FormGrid,
  MetricCard,
  MetricGrid,
  Modal,
  ModalBody,
  ModalFooter,
  PageHeader,
  PlusIcon,
  Select,
  TableCellEntity,
  Building2Icon,
  UsersRoundIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/design-system"
import { useAccess } from "@/app-shell/session"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery } from "@/shared/api/query"
import { PACKAGE_INFO, PACKAGES, PLAN_INFO, type PackageKey, type PlanKey } from "@/shared/auth/entitlements"
import { PARTNER_TYPES, partnerInputSchema, tenantCreateSchema, type Partner, type Tenant } from "@/shared/contracts/tenancy"
import { applyServerErrors, Form, FormInput, FormSelect, useZodForm } from "@/shared/forms"
import { formatDate, money } from "@/shared/lib/format"
import { StatusBadge } from "@/shared/ui/status"

type TenantRow = Tenant & { url: string; partnerName?: string; mrr: number; packages: PackageKey[]; usage: { officeUsers: number; vehicles: number; trips: number } }
type PartnerRow = Partner & { tenantCount: number; mrr: number; commission: number }
const KEY = ["platform"]
const PLAN_OPTIONS = (Object.keys(PLAN_INFO) as PlanKey[]).map((k) => ({ value: k, label: PLAN_INFO[k].name }))

/* ------------------------------------------------------------------ */

export function PlatformHome() {
  const { me, can } = useAccess()
  if (!me) return null
  return can("platform:tenants") ? <PlatformOverview /> : <PartnerPortfolio />
}

function PlatformOverview() {
  const { data } = useApiQuery<{ tenants: number; active: number; trial: number; mrr: number; partners: number; users: number }>([...KEY, "overview"], "/platform/overview")
  return (
    <>
      <PageHeader eyebrow="PLATFORM" title="Genel bakış" description="Tüm çalışma alanları, paketler ve iş ortakları." />
      {data && (
        <MetricGrid>
          <MetricCard label="Firmalar" value={String(data.tenants)} change={`${data.active} aktif`} foot={`${data.trial} deneme sürecinde`} icon={<Building2Icon size={18} />} />
          <MetricCard label="Aylık yinelenen gelir" value={money(data.mrr)} change="MRR" foot="Kademe + eklenti fiyatları" icon={<TrendingUpIcon size={18} />} />
          <MetricCard label="İş ortakları" value={String(data.partners)} change="%10 komisyon" foot="Yönlendiren partnerler" icon={<UsersRoundIcon size={18} />} />
          <MetricCard label="Kullanıcılar" value={String(data.users)} change="tüm tenantlar" foot="İç + dış kullanıcılar" icon={<WalletIcon size={18} />} />
        </MetricGrid>
      )}
      <div className="mt-6">
        <TenantsTable />
      </div>
    </>
  )
}

function PartnerPortfolio() {
  const { data } = useApiQuery<{ partner: Partner; tenants: TenantRow[]; mrr: number; commission: number }>([...KEY, "portfolio"], "/platform/portfolio")
  if (!data) return null
  return (
    <>
      <PageHeader eyebrow="İŞ ORTAĞI" title={data.partner.name} description={`${data.partner.type} · Komisyon oranı %${Math.round(data.partner.commissionRate * 100)}`} />
      <MetricGrid>
        <MetricCard label="Yönlendirilen firma" value={String(data.tenants.length)} change="aktif portföy" foot="Seferhane'yi kullanan firmalar" icon={<Building2Icon size={18} />} />
        <MetricCard label="Portföy MRR" value={money(data.mrr)} change="aylık" foot="Firmaların toplam abonelik bedeli" icon={<TrendingUpIcon size={18} />} />
        <MetricCard label="Aylık komisyon" value={money(data.commission)} change={`%${Math.round(data.partner.commissionRate * 100)}`} foot="Bir sonraki ödeme dönemi" icon={<WalletIcon size={18} />} />
      </MetricGrid>
      <div className="mt-6">
        <Card title="Portföyünüzdeki firmalar" headerSpacing="loose">
          <DataTable<TenantRow>
            aria-label="Portföy"
            data={data.tenants}
            getRowId={(t) => t.id}
            empty={<EmptyState title="Henüz yönlendirilen firma yok" />}
            columns={[
              { key: "name", header: "Firma", cell: (t) => <TableCellEntity title={t.name} subtitle={`${t.slug}.seferhane.com`} /> },
              { key: "plan", header: "Paket", cell: (t) => PLAN_INFO[t.plan].name },
              { key: "status", header: "Durum", cell: (t) => <StatusBadge status={t.status} /> },
              { key: "mrr", header: "MRR", cell: (t) => money(t.mrr) },
              { key: "commission", header: "Komisyon", cell: (t) => money(t.mrr * data.partner.commissionRate) },
            ]}
          />
        </Card>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */

export function TenantsScreen() {
  return (
    <>
      <PageHeader eyebrow="PLATFORM" title="Firmalar (tenant)" description="Her firma kendi alt alan adında izole çalışır: firma.seferhane.com" />
      <TenantsTable />
    </>
  )
}

function TenantsTable() {
  const { data } = useApiQuery<TenantRow[]>([...KEY, "tenants"], "/platform/tenants")
  const partners = useApiQuery<PartnerRow[]>([...KEY, "partners"], "/platform/partners")
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<TenantRow | null>(null)
  return (
    <Card
      title="Çalışma alanları"
      headerSpacing="loose"
      action={
        <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(true)}>
          Firma oluştur
        </Button>
      }
    >
      <DataTable<TenantRow>
        aria-label="Firmalar"
        data={data ?? []}
        getRowId={(t) => t.id}
        onRowClick={setEditing}
        minWidth={820}
        columns={[
          { key: "name", header: "Firma", sortValue: (t) => t.name, cell: (t) => <TableCellEntity title={t.name} subtitle={<a className="text-brand underline" href={t.url} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer">{t.slug}.seferhane.com</a>} /> },
          { key: "plan", header: "Paket", cell: (t) => PLAN_INFO[t.plan].name },
          { key: "addons", header: "Eklentiler", hideOnMobile: true, cell: (t) => t.addons.map((a) => PACKAGE_INFO[a].name).join(", ") || "—" },
          { key: "partner", header: "İş ortağı", cell: (t) => t.partnerName ?? "—" },
          { key: "usage", header: "Kullanım", cell: (t) => `${t.usage.officeUsers} kullanıcı · ${t.usage.vehicles} araç` },
          { key: "status", header: "Durum", cell: (t) => <StatusBadge status={t.status} tone={t.status === "Askıda" ? "red" : undefined} /> },
          { key: "mrr", header: "MRR", sortValue: (t) => t.mrr, cell: (t) => <strong>{money(t.mrr)}</strong> },
        ]}
      />
      {creating && <TenantModal partners={partners.data ?? []} onClose={() => setCreating(false)} />}
      {editing && <TenantEditModal tenant={editing} partners={partners.data ?? []} onClose={() => setEditing(null)} />}
    </Card>
  )
}

function TenantModal({ partners, onClose }: { partners: PartnerRow[]; onClose: () => void }) {
  const form = useZodForm(tenantCreateSchema, {
    defaultValues: { name: "", legalName: "", slug: "", plan: "starter", addons: [], partnerId: "", ownerName: "", ownerEmail: "" },
  })
  const slug = useWatch({ control: form.control, name: "slug" })
  const create = useApiMutation((v: unknown) => http.post<TenantRow>("/platform/tenants", v), {
    invalidate: [KEY],
    toastError: false,
    success: (t) => `${t.name} oluşturuldu · ${t.slug}.seferhane.com (yönetici şifresi: demo1234)`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Firma oluştur" subtitle="Yeni çalışma alanı · 14 gün deneme">
      <Form form={form} onSubmit={(v) => create.mutate({ ...v, partnerId: v.partnerId || undefined }, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormGrid>
            <FormInput name="name" label="Firma adı" autoFocus required />
            <FormInput name="slug" label="Alt alan adı" hint={`${slug || "firma"}.seferhane.com`} required />
          </FormGrid>
          <FormInput name="legalName" label="Ticari unvan" required />
          <FormGrid>
            <FormSelect name="plan" label="Kademe" options={PLAN_OPTIONS} />
            <FormSelect name="partnerId" label="Yönlendiren iş ortağı" options={[{ value: "", label: "Doğrudan satış" }, ...partners.map((p) => ({ value: p.id, label: p.name }))]} />
          </FormGrid>
          <FormGrid>
            <FormInput name="ownerName" label="Yönetici adı" required />
            <FormInput name="ownerEmail" label="Yönetici e-postası" type="email" required />
          </FormGrid>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Firmayı oluştur
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

function TenantEditModal({ tenant, partners, onClose }: { tenant: TenantRow; partners: PartnerRow[]; onClose: () => void }) {
  const [plan, setPlan] = useState<PlanKey>(tenant.plan)
  const [addons, setAddons] = useState<PackageKey[]>(tenant.addons)
  const [status, setStatus] = useState(tenant.status)
  const [partnerId, setPartnerId] = useState(tenant.partnerId ?? "")
  const save = useApiMutation(() => http.patch(`/platform/tenants/${tenant.id}`, { plan, addons, status, partnerId: partnerId || null }), {
    invalidate: [KEY],
    success: "Paket ve durum güncellendi.",
    onSuccess: onClose,
  })
  const included = PLAN_INFO[plan].packages
  return (
    <Modal open onClose={onClose} title={tenant.name} subtitle={`${tenant.slug}.seferhane.com · kayıt ${formatDate(tenant.createdAt)}`}>
      <ModalBody>
        <FormGrid>
          <Select aria-label="Kademe" value={plan} onChange={(e) => setPlan(e.target.value as PlanKey)} options={PLAN_OPTIONS} />
          <Select aria-label="Durum" value={status} onChange={(e) => setStatus(e.target.value as Tenant["status"])} options={["Aktif", "Deneme", "Askıda"]} />
        </FormGrid>
        <div className="my-5">
          <Select aria-label="İş ortağı" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} options={[{ value: "", label: "Doğrudan satış" }, ...partners.map((p) => ({ value: p.id, label: p.name }))]} />
        </div>
        <h3 className="mb-3 text-sm font-semibold-soft text-ink-heading">Paketler</h3>
        <div className="flex flex-col gap-3">
          {PACKAGES.map((p) => (
            <Checkbox
              key={p}
              label={
                <span>
                  {PACKAGE_INFO[p].name} {included.includes(p) && <Badge tone="blue">kademeye dahil</Badge>}
                </span>
              }
              description={PACKAGE_INFO[p].addonPrice && !included.includes(p) ? `Eklenti · ${money(PACKAGE_INFO[p].addonPrice!)}/ay` : undefined}
              checked={included.includes(p) || addons.includes(p)}
              disabled={included.includes(p)}
              onChange={(e) => setAddons(e.target.checked ? [...addons, p] : addons.filter((a) => a !== p))}
            />
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
          Kaydet
        </Button>
      </ModalFooter>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */

export function PartnersScreen() {
  const { data } = useApiQuery<PartnerRow[]>([...KEY, "partners"], "/platform/partners")
  const [creating, setCreating] = useState(false)
  return (
    <>
      <PageHeader eyebrow="PLATFORM" title="İş ortakları" description="Sigorta acenteleri, filo kiralama şirketleri ve mali müşavirler — yönlendirme komisyonu." />
      <Card
        title="Partnerler"
        headerSpacing="loose"
        action={
          <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(true)}>
            Partner ekle
          </Button>
        }
      >
        <DataTable<PartnerRow>
          aria-label="İş ortakları"
          data={data ?? []}
          getRowId={(p) => p.id}
          minWidth={720}
          columns={[
            { key: "name", header: "Partner", cell: (p) => <TableCellEntity title={p.name} subtitle={`${p.contactName} · ${p.email}`} /> },
            { key: "type", header: "Tür", cell: (p) => p.type },
            { key: "rate", header: "Komisyon", cell: (p) => `%${Math.round(p.commissionRate * 100)}` },
            { key: "tenants", header: "Firma", cell: (p) => p.tenantCount },
            { key: "mrr", header: "Portföy MRR", cell: (p) => money(p.mrr) },
            { key: "commission", header: "Aylık komisyon", cell: (p) => <strong>{money(p.commission)}</strong> },
            { key: "status", header: "Durum", cell: (p) => <StatusBadge status={p.status} /> },
          ]}
        />
      </Card>
      {creating && <PartnerModal onClose={() => setCreating(false)} />}
    </>
  )
}

function PartnerModal({ onClose }: { onClose: () => void }) {
  const form = useZodForm(partnerInputSchema, { defaultValues: { name: "", type: "Sigorta acentesi", contactName: "", email: "", phone: "", commissionRate: 10 } })
  const create = useApiMutation((v: unknown) => http.post("/platform/partners", v), {
    invalidate: [KEY],
    toastError: false,
    success: "İş ortağı eklendi.",
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Partner ekle" subtitle="Yönlendiren iş ortağı">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="name" label="Partner adı" autoFocus required />
          <FormGrid>
            <FormSelect name="type" label="Tür" options={[...PARTNER_TYPES]} />
            <FormInput name="commissionRate" label="Komisyon (%)" type="number" min={0} max={50} />
          </FormGrid>
          <FormGrid>
            <FormInput name="contactName" label="Yetkili" required />
            <FormInput name="email" label="E-posta" type="email" required />
          </FormGrid>
          <FormInput name="phone" label="Telefon" optional />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Partneri ekle
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
