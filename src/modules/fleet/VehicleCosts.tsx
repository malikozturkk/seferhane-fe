"use client"

import { useState } from "react"
import {
  BreakdownChart,
  Button,
  Card,
  DataTable,
  DatePicker,
  DownloadIcon,
  EmptyState,
  FormGrid,
  Grid,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  SegmentedControl,
  Select,
  StackedBarChart,
  StatGroup,
  UploadZone,
  categoricalPalette,
} from "@/design-system"
import { useAccess } from "@/app-shell/session"
import { useVehicleOptions } from "@/entities/lookups"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery } from "@/shared/api/query"
import {
  EXPENSE_CATEGORIES,
  vehicleExpenseSchema,
  type ExpenseCategory,
  type VehicleCostSummary,
  type VehicleExpense,
} from "@/shared/contracts/resources"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, useZodForm } from "@/shared/forms"
import { addDays, today } from "@/shared/lib/clock"
import { exportCSV } from "@/shared/lib/csv"
import { formatDateNumeric, money } from "@/shared/lib/format"

const PERIODS = [
  { value: "week", label: "Haftalık" },
  { value: "month", label: "Aylık" },
  { value: "year", label: "1 yıllık" },
  { value: "year3", label: "3 yıllık" },
  { value: "year5", label: "5 yıllık" },
  { value: "custom", label: "Özel aralık" },
]
const COLOR = Object.fromEntries(EXPENSE_CATEGORIES.map((c, i) => [c, categoricalPalette[i]])) as Record<ExpenseCategory, string>
const KEY = ["vehicle-costs"]

/** Filo → Araç maliyetleri (plan §5.7). */
export function VehicleCosts() {
  const { canDo } = useAccess()
  const vehicles = useVehicleOptions()
  const [vehicleId, setVehicleId] = useState("")
  const [category, setCategory] = useState("")
  const [period, setPeriod] = useState("month")
  const [from, setFrom] = useState(addDays(today(), -90))
  const [to, setTo] = useState(today())
  const [view, setView] = useState("chart")
  const [adding, setAdding] = useState(false)
  const { data } = useApiQuery<VehicleCostSummary>(KEY, "/vehicle-costs", {
    vehicleId,
    category,
    period,
    from: period === "custom" ? from : undefined,
    to: period === "custom" ? to : undefined,
    limit: view === "chart" ? 12 : 300,
  })
  const plate = vehicles.data?.items.find((v) => v.id === vehicleId)?.plate ?? "Tüm filo"
  const range = data ? `${formatDateNumeric(data.from)} – ${formatDateNumeric(data.to)}` : ""

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[190px]">
          <Select
            aria-label="Araç (plaka)"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            options={[{ value: "", label: "Tüm araçlar" }, ...(vehicles.data?.items ?? []).map((v) => ({ value: v.id, label: `${v.plate} · ${v.model}` }))]}
          />
        </div>
        <div className="min-w-[160px]">
          <Select
            aria-label="Masraf kalemi"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[{ value: "", label: "Tüm kalemler" }, ...EXPENSE_CATEGORIES]}
          />
        </div>
        <SegmentedControl aria-label="Dönem" value={period} onChange={setPeriod} options={PERIODS} />
        {period === "custom" && (
          <>
            <DatePicker aria-label="Başlangıç" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <DatePicker aria-label="Bitiş" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} />
          </>
        )}
        <div className="ml-auto flex gap-2">
          <SegmentedControl
            aria-label="Görünüm"
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: "Grafik" },
              { value: "list", label: "Liste" },
            ]}
          />
          {canDo("vehicleCosts", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={14} />} onClick={() => setAdding(true)}>
              Masraf ekle
            </Button>
          )}
        </div>
      </div>

      <div className="px-5 pb-5">
        <StatGroup
          items={[
            { label: "Toplam masraf", value: money(data?.total ?? 0), caption: range },
            { label: "Araç başı", value: money(data?.perVehicle ?? 0), caption: `${data?.vehicleCount ?? 0} araç` },
            { label: "Aylık ortalama", value: money(data?.monthlyAverage ?? 0), caption: "Seçili dönem" },
            {
              label: "En büyük kalem",
              value: data?.topCategory?.category ?? "—",
              caption: data?.topCategory ? `${money(data.topCategory.amount)} · %${Math.round(data.topCategory.share * 100)}` : "Masraf yok",
            },
          ]}
        />
      </div>

      {view === "chart" && data && (
        <div className="px-5 pb-5">
          <Grid layout="charts">
            <Card title={`Masraf trendi · ${plate}`} subtitle="Dönem bazında, kalemlere göre yığılmış" padding="md">
              {data.buckets.length ? (
                <StackedBarChart
                  aria-label="Masraf trendi"
                  data={data.buckets.map((b) => ({ label: b.label, values: b.values as Record<string, number> }))}
                  series={EXPENSE_CATEGORIES.map((c) => ({ key: c, label: c, color: COLOR[c] }))}
                />
              ) : (
                <EmptyState title="Bu aralıkta masraf yok" description="Dönemi veya aracı değiştirin." />
              )}
            </Card>
            <Card title="Kalem bazında dağılım">
              <div className="px-[22px] pt-7 pb-3">
                {data.byCategory.length ? (
                  <BreakdownChart
                    aria-label="Kalem bazında dağılım"
                    relativeTo="max"
                    data={data.byCategory.map((c) => ({
                      label: c.category,
                      value: c.amount,
                      color: COLOR[c.category],
                      valueLabel: `${money(c.amount)} · %${Math.round((c.amount / (data.total || 1)) * 100)}`,
                    }))}
                  />
                ) : (
                  <EmptyState title="Bu aralıkta masraf yok" description="Dönemi veya aracı değiştirin." />
                )}
              </div>
            </Card>
          </Grid>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border-subtle px-[21px] pt-[21px]">
        <div>
          <h3 className="text-md font-semibold text-ink-heading">{view === "list" ? "Masraf listesi" : "Son masraf kayıtları"}</h3>
          <p className="mt-1.5 text-xs text-ink-subtle">{data?.rowCount ?? 0} kayıt · tarih sırasına göre</p>
        </div>
        {canDo("vehicleCosts", "export") && (
          <Button
            size="sm"
            leftIcon={<DownloadIcon size={14} />}
            onClick={() =>
              exportCSV(
                [["Tarih", "Plaka", "Kalem", "Açıklama", "Tutar"], ...(data?.rows ?? []).map((e) => [e.date, e.plate, e.category, e.description, e.amount])],
                `arac-maliyetleri-${plate}`,
              )
            }
          >
            Excel uyumlu indir
          </Button>
        )}
      </div>
      <div className="pt-4">
        <DataTable<VehicleExpense>
          aria-label="Masraf listesi"
          data={data?.rows ?? []}
          getRowId={(e) => e.id}
          empty={<EmptyState title="Bu aralıkta masraf yok" description="Dönemi veya aracı değiştirin." />}
          footer={
            view === "chart" && (data?.rowCount ?? 0) > 12 ? (
              <>
                <span>{data?.rowCount} kayıttan 12 tanesi gösteriliyor</span>
                <Button variant="link" onClick={() => setView("list")}>
                  Tüm listeyi aç
                </Button>
              </>
            ) : undefined
          }
          columns={[
            { key: "date", header: "Tarih", sortValue: (e) => e.date, cell: (e) => formatDateNumeric(e.date) },
            { key: "plate", header: "Plaka", sortValue: (e) => e.plate, cell: (e) => <strong>{e.plate}</strong> },
            {
              key: "category",
              header: "Kalem",
              cell: (e) => (
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-[2px]" style={{ background: COLOR[e.category] }} />
                  {e.category}
                </span>
              ),
            },
            { key: "description", header: "Açıklama", hideOnMobile: true, cell: (e) => e.description },
            { key: "amount", header: "Tutar", align: "right", sortValue: (e) => e.amount, cell: (e) => <strong>{money(e.amount)}</strong> },
          ]}
        />
      </div>
      {adding && <AddExpenseModal defaultVehicleId={vehicleId} onClose={() => setAdding(false)} />}
    </>
  )
}

function AddExpenseModal({ defaultVehicleId, onClose }: { defaultVehicleId: string; onClose: () => void }) {
  const vehicles = useVehicleOptions()
  const form = useZodForm(vehicleExpenseSchema, {
    defaultValues: {
      vehicleId: defaultVehicleId || vehicles.data?.items[0]?.id || "",
      category: "Yakıt",
      date: today(),
      amount: "" as never,
      description: "",
    },
  })
  const create = useApiMutation((v: unknown) => http.post<VehicleExpense>("/vehicle-costs", v), {
    invalidate: [KEY, ["vehicles"]],
    toastError: false,
    success: (e) => `${e.plate} için ${money(e.amount)} ${e.category} masrafı eklendi.`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Araç masrafı ekle" subtitle="Bu araç için yapılan harcama">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormSelect name="vehicleId" label="Araç (plaka)" options={(vehicles.data?.items ?? []).map((v) => ({ value: v.id, label: `${v.plate} · ${v.model}` }))} />
          <FormGrid>
            <FormSelect name="category" label="Masraf kalemi" options={[...EXPENSE_CATEGORIES]} />
            <FormDate name="date" label="Tarih" max={today()} />
          </FormGrid>
          <FormInput name="amount" label="Tutar (₺)" type="number" min={1} required />
          <FormInput name="description" label="Açıklama" placeholder="Örn. Motorin · 280 L" />
          <UploadZone accept=".pdf,image/*" title="Fatura / fiş (isteğe bağlı)" description="WhatsApp'tan gelen fiş fotoğrafı" onFilesChange={([f]) => form.setValue("receipt", f.name)} />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Masrafı ekle
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
