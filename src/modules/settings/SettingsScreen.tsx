"use client"

import { useState } from "react"
import {
  Alert,
  Badge,
  Button,
  Card,
  CheckIcon,
  DataTable,
  DownloadIcon,
  EmptyState,
  FormGrid,
  Grid,
  ListItem,
  ProgressBar,
  SearchInput,
  ShieldCheckIcon,
  Switch,
  Toolbar,
  useToast,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import { PACKAGE_INFO, PACKAGES, PLAN_INFO, type PackageKey, type PlanInfo, type PlanKey } from "@/shared/auth/entitlements"
import type { Activity } from "@/shared/contracts/common"
import { tenantProfileSchema, type Tenant } from "@/shared/contracts/tenancy"
import { applyServerErrors, Form, FormInput, FormTextarea, useZodForm } from "@/shared/forms"
import { exportCSV } from "@/shared/lib/csv"
import { formatDateTime, money, number } from "@/shared/lib/format"
import { ListFooter } from "@/shared/ui/ListFooter"
import { useListState } from "@/shared/ui/useListState"
import { AccessSettings } from "./AccessSettings"

const KEY = ["settings"]

export function SettingsScreen() {
  return (
    <ModuleWorkspace module="settings" customTabs={["Şirket bilgileri", "Kullanıcılar & roller", "Belge & sefer şablonları", "Bildirimler", "Aktivite kayıtları", "Paket & kullanım"]}>
      {(tab) =>
        tab === "Şirket bilgileri" ? (
          <CompanySettings />
        ) : tab === "Kullanıcılar & roller" ? (
          <AccessGate />
        ) : tab === "Belge & sefer şablonları" ? (
          <Preferences kind="templates" title="Operasyon tipleri ve zorunlu belge şablonları" subtitle="Yeni sefer dosyası açıldığında belge listesi ve görevler bu şablonlardan oluşur." />
        ) : tab === "Bildirimler" ? (
          <Preferences kind="notifications" title="Bildirim tercihleri" subtitle="Uygulama içi bildirim merkezi ve günlük özet e-postası." />
        ) : tab === "Aktivite kayıtları" ? (
          <AuditLog />
        ) : (
          <Billing />
        )
      }
    </ModuleWorkspace>
  )
}

function AccessGate() {
  const { canDo } = useAccess()
  if (!canDo("users", "view")) return <EmptyState title="Kullanıcı yönetimi yetkiniz yok" description="Bu bölüm şirket yöneticilerine açıktır." />
  return <AccessSettings />
}

function CompanySettings() {
  const { canDo } = useAccess()
  const { data: tenant } = useApiQuery<Tenant>([...KEY, "company"], "/settings/company")
  if (!tenant) return null
  return <CompanyForm tenant={tenant} editable={canDo("settings", "update")} />
}

function CompanyForm({ tenant, editable }: { tenant: Tenant; editable: boolean }) {
  const form = useZodForm(tenantProfileSchema, {
    defaultValues: { legalName: tenant.legalName, taxOffice: tenant.taxOffice, taxNumber: tenant.taxNumber, address: tenant.address, phone: tenant.phone, email: tenant.email },
  })
  const save = useApiMutation((v: unknown) => http.patch<Tenant>("/settings/company", v), {
    invalidate: [KEY, ["me"]],
    toastError: false,
    success: "Şirket bilgileri kaydedildi.",
  })
  return (
    <Grid layout="cols-2" className="items-start md:grid-cols-[1.4fr_1fr]">
      <Card title="Şirket bilgileri" subtitle={`${tenant.slug}.seferhane.com · Çalışma alanı`}>
        <Form form={form} className="px-[22px] py-[25px]" onSubmit={(v) => save.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
          <fieldset disabled={!editable}>
            <FormInput name="legalName" label="Şirket unvanı" required />
            <FormGrid>
              <FormInput name="taxOffice" label="Vergi dairesi" />
              <FormInput name="taxNumber" label="Vergi numarası" inputMode="numeric" />
            </FormGrid>
            <FormTextarea name="address" label="Merkez adresi" rows={2} />
            <FormGrid>
              <FormInput name="phone" label="Telefon" />
              <FormInput name="email" label="E-posta" type="email" />
            </FormGrid>
            {editable && (
              <Button type="submit" variant="primary" leftIcon={<CheckIcon size={15} />} loading={save.isPending}>
                Değişiklikleri kaydet
              </Button>
            )}
          </fieldset>
        </Form>
      </Card>
      <div className="flex flex-col gap-5">
        <Card title="Merkez & departmanlar">
          <div className="mt-3">
            <ListItem variant="simple" title={tenant.site} description="Merkez" trailing={<Badge>Aktif</Badge>} />
            {tenant.departments.map((d) => (
              <ListItem key={d} variant="simple" title={`${d} · Departman`} trailing={<Badge>Aktif</Badge>} />
            ))}
          </div>
        </Card>
        <Alert
          tone="info"
          icon={<ShieldCheckIcon size={20} />}
          title="Verileriniz size ait."
          action={
            <Button
              size="sm"
              leftIcon={<DownloadIcon size={14} />}
              onClick={() => exportCSV([["Şirket", "Unvan", "Vergi no"], [tenant.name, tenant.legalName, tenant.taxNumber]], "sirket-verileri")}
            >
              Verilerimi dışa aktar
            </Button>
          }
        >
          Tüm kayıtlarınızı istediğiniz an tek tıkla dışa aktarabilirsiniz (KVKK).
        </Alert>
      </div>
    </Grid>
  )
}

function Preferences({ kind, title, subtitle }: { kind: "notifications" | "templates"; title: string; subtitle: string }) {
  const { canDo } = useAccess()
  const { data: tenant } = useApiQuery<Tenant>([...KEY, "company"], "/settings/company")
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null)
  const values = draft ?? tenant?.settings[kind] ?? {}
  const save = useApiMutation(() => http.patch("/settings/preferences", { [kind]: values }), {
    invalidate: [KEY],
    success: kind === "templates" ? "Şablon tercihleri güncellendi. Yeni sefer dosyalarına uygulanır." : "Bildirim tercihleri güncellendi.",
    onSuccess: () => setDraft(null),
  })
  const editable = canDo("settings", "update")
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="mt-3">
        {Object.entries(values).map(([label, on]) => (
          <Switch
            key={label}
            label={label}
            description={kind === "templates" ? "Zorunlu belge listesi + 3 kontrol görevi" : label.includes("E-posta") ? "Her iş günü 08:00’de özet e-posta" : "Uygulama içi bildirim merkezi"}
            checked={on}
            disabled={!editable}
            onCheckedChange={(v) => setDraft({ ...values, [label]: v })}
          />
        ))}
      </div>
      {editable && (
        <div className="p-5">
          <Button variant="primary" disabled={!draft} loading={save.isPending} onClick={() => save.mutate()}>
            {kind === "templates" ? "Şablonları kaydet" : "Tercihleri kaydet"}
          </Button>
        </div>
      )}
    </Card>
  )
}

function AuditLog() {
  const { canDo } = useAccess()
  const list = useListState({ pageSize: 20 })
  const { data } = useListQuery<Activity>([...KEY, "audit"], "/settings/audit", list.params, canDo("audit", "view"))
  if (!canDo("audit", "view")) return <EmptyState title="Denetim izi yetkiniz yok" />
  return (
    <Card
      title="Denetim izi"
      subtitle="Kim, ne zaman, hangi veriyi değiştirdi?"
      action={
        canDo("audit", "export") && (
          <Button
            size="sm"
            leftIcon={<DownloadIcon size={14} />}
            onClick={() => exportCSV([["Zaman", "Kullanıcı", "Kayıt", "İşlem"], ...(data?.items ?? []).map((a) => [a.createdAt, a.actorName, a.entityLabel, a.summary])], "denetim-kaydi")}
          >
            Denetim kaydını aktar
          </Button>
        )
      }
    >
      <Toolbar start={<SearchInput value={list.q} onValueChange={list.setQ} placeholder="Kullanıcı, kayıt veya işlem ara..." />} />
      <DataTable<Activity>
        aria-label="Denetim izi"
        data={data?.items ?? []}
        getRowId={(a) => a.id}
        minWidth={640}
        sort={list.tableSort}
        onSortChange={list.onTableSort}
        empty={<EmptyState title="Kayıt bulunamadı" />}
        footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} />}
        columns={[
          { key: "createdAt", header: "Zaman", sortValue: (a) => a.createdAt, cell: (a) => formatDateTime(a.createdAt) },
          { key: "actor", header: "Kullanıcı", sortValue: (a) => a.actorName, cell: (a) => a.actorName },
          { key: "entity", header: "Kayıt", cell: (a) => <strong>{a.entityLabel}</strong> },
          {
            key: "summary",
            header: "İşlem",
            cell: (a) => (
              <>
                {a.summary}
                {a.changes?.length ? <span className="block text-2xs text-ink-faint">{a.changes.map((c) => `${c.field}: ${String(c.from)} → ${String(c.to)}`).join(" · ")}</span> : null}
              </>
            ),
          },
        ]}
      />
    </Card>
  )
}

interface BillingData {
  plan: PlanKey
  planInfo: PlanInfo
  addons: PackageKey[]
  packages: Array<{ key: PackageKey; name: string; description: string }>
  usage: { officeUsers: number; externalUsers: number; vehicles: number; drivers: number; storageGb: number }
}

function Billing() {
  const { canDo } = useAccess()
  const { notify } = useToast()
  const { data } = useApiQuery<BillingData>([...KEY, "billing"], "/settings/billing", undefined, { enabled: canDo("billing", "view") })
  if (!canDo("billing", "view")) return <EmptyState title="Paket bilgileri yalnızca şirket yöneticisine açıktır" />
  if (!data) return null
  const { planInfo: p, usage: u } = data
  return (
    <Grid layout="cols-2" className="items-start">
      <Card title={`${p.name} paketi`} subtitle="Araç ve ofis kullanıcısı bazlı fiyatlandırma · şoförler ve dış kullanıcılar ücretsiz">
        <div className="px-[23px] pt-[30px] pb-5 text-[35px] tracking-[-1px] text-sage-700">
          {p.monthlyPrice ? money(p.monthlyPrice) : "Teklif"}
          <span className="pl-1.5 text-base tracking-normal text-sage-subtle">/ ay · yıllık ödemede</span>
        </div>
        <div className="flex flex-col gap-[18px] px-[23px] pb-6">
          {PACKAGES.map((k) => {
            const on = data.packages.some((x) => x.key === k)
            return (
              <span key={k} className={`flex items-start gap-2 text-xs ${on ? "text-sage-600" : "text-ink-faint line-through"}`}>
                <CheckIcon size={15} className="mt-px shrink-0" />
                <span>
                  <strong className="font-medium">{PACKAGE_INFO[k].name}</strong>
                  {data.addons.includes(k) && " · eklenti"}
                  <small className="block text-2xs no-underline">{PACKAGE_INFO[k].description}</small>
                </span>
              </span>
            )
          })}
        </div>
        {canDo("billing", "manage") && (
          <div className="border-t border-border-subtle p-5">
            <Button variant="primary" onClick={() => notify("Paket değişikliği talebiniz alındı. Platform ekibi sizinle iletişime geçecek.")}>
              Aboneliği yönet
            </Button>
          </div>
        )}
      </Card>
      <Card title="Kullanımınız" padding="md">
        <div className="flex flex-col gap-6">
          <ProgressBar label="Depolama" valueLabel={`${number(u.storageGb)} / ${p.storageGb} GB`} value={u.storageGb} max={p.storageGb} />
          <ProgressBar label="Ofis kullanıcıları" valueLabel={`${u.officeUsers} / ${p.maxOfficeUsers ?? "∞"}`} value={u.officeUsers} max={p.maxOfficeUsers ?? u.officeUsers} />
          <ProgressBar label="Araçlar" valueLabel={`${u.vehicles} / ${p.maxVehicles ?? "∞"}`} value={u.vehicles} max={p.maxVehicles ?? u.vehicles} />
          <ProgressBar label="Şoför kayıtları" valueLabel={`${u.drivers} · lisans gerekmez`} value={1} max={1} />
          <ProgressBar label="Dış (portal) kullanıcıları" valueLabel={`${u.externalUsers} · ücretsiz`} value={1} max={1} />
        </div>
      </Card>
      <Card title="Kademeler" subtitle="Örnek fiyatlar, KDV hariç" className="md:col-span-2">
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          {(Object.keys(PLAN_INFO) as PlanKey[]).map((k) => (
            <div key={k} className={`rounded-lg border p-5 ${k === data.plan ? "border-primary" : "border-border-subtle"}`}>
              <div className="flex items-center justify-between">
                <strong className="text-base text-ink-heading">{PLAN_INFO[k].name}</strong>
                {k === data.plan && <Badge>Mevcut paket</Badge>}
              </div>
              <p className="mt-2 text-2xl text-sage-700">{PLAN_INFO[k].monthlyPrice ? money(PLAN_INFO[k].monthlyPrice!) : "Teklif"}</p>
              <p className="mt-2 text-2xs text-ink-subtle">
                {PLAN_INFO[k].maxVehicles ?? "Sınırsız"} araç · {PLAN_INFO[k].maxOfficeUsers ?? "Sınırsız"} ofis kullanıcısı · {PLAN_INFO[k].storageGb} GB
              </p>
            </div>
          ))}
        </div>
      </Card>
    </Grid>
  )
}
