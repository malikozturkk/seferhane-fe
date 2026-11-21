"use client"

import { useState } from "react"
import {
  Button,
  Card,
  CheckIcon,
  DescriptionList,
  FileTextIcon,
  FormGrid,
  IconButton,
  IconTile,
  ListItem,
  PlusIcon,
  StatGroup,
  Trash2Icon,
} from "@/design-system"
import { fileSize, useTripActions } from "@/entities/trip/api"
import { tripClosingSchema, tripCostSchema, tripExpenseSchema, type TripView } from "@/shared/contracts/operations"
import { applyServerErrors, Form, FormInput, useZodForm } from "@/shared/forms"
import { formatDateNumeric, money, number } from "@/shared/lib/format"
import { FilePickButton } from "@/shared/ui/FilePickButton"

/* ------------------------------------------------------------------ */
/* Maliyet & kârlılık                                                   */
/* ------------------------------------------------------------------ */

export function TripCosts({ trip, editable }: { trip: TripView; editable: boolean }) {
  const actions = useTripActions(trip.id)
  const form = useZodForm(tripCostSchema, { defaultValues: { name: "Ek hizmet", amount: "" as unknown as number } })
  return (
    <>
      <div className="mb-5">
        <StatGroup
          items={[
            { label: "Toplam gelir", value: money(trip.revenue) },
            { label: "Toplam gider", value: money(trip.cost) },
            { label: "Brüt kâr", value: money(trip.profit), tone: trip.profit >= 0 ? "positive" : "warning" },
          ]}
        />
      </div>
      <Card title="Gelir & gider kalemleri" subtitle="Kaynağına kadar izlenebilir operasyon maliyetleri.">
        <div className="mt-4">
          <ListItem
            variant="finance"
            title="Navlun geliri"
            description="Müşteri tarifesi"
            trailing={<span className="text-success-text">{money(trip.revenue)}</span>}
          />
          {trip.costItems.map((c) => (
            <ListItem key={c.id} variant="finance" title={c.name} description={SOURCE_LABEL[c.source] ?? c.source} trailing={money(-c.amount)} />
          ))}
        </div>
        {editable && (
          <Form
            form={form}
            className="flex flex-wrap items-start gap-2 p-5"
            onSubmit={(v) => actions.addCost.mutate(v, { onSuccess: () => form.reset({ name: "Ek hizmet", amount: "" as unknown as number }), onError: (e) => applyServerErrors(form as never, e) })}
          >
            <div className="min-w-[140px] flex-1">
              <FormInput name="name" label="Gider adı" flush />
            </div>
            <div className="min-w-[120px] flex-1">
              <FormInput name="amount" label="Tutar (₺)" type="number" min={1} placeholder="Tutar (₺)" flush />
            </div>
            <div className="pt-[25px]">
              <Button type="submit" variant="primary" leftIcon={<PlusIcon size={14} />} loading={actions.addCost.isPending}>
                Gider ekle
              </Button>
            </div>
          </Form>
        )}
      </Card>
    </>
  )
}

const SOURCE_LABEL: Record<string, string> = {
  Yakıt: "Filo modülü",
  "Şoför masrafı": "WhatsApp'tan gelen fiş fotoğrafları",
  "HGS & köprü": "Manuel",
  "Sabit maliyet payı": "Dağıtım kuralı",
  Manuel: "Manuel",
}

/* ------------------------------------------------------------------ */
/* Sefer kapanışı (plan §5.4)                                           */
/* ------------------------------------------------------------------ */

export function TripClosingPanel({ trip, editable }: { trip: TripView; editable: boolean }) {
  const c = trip.closing ?? { expenses: [], invoices: [] }
  const actions = useTripActions(trip.id)
  const [editing, setEditing] = useState(!trip.closing)
  const spend = c.expenses.reduce((s, e) => s + e.amount, 0)
  const used = c.fuelOut != null && c.fuelIn != null ? c.fuelOut + (c.fuelBought ?? 0) - c.fuelIn : undefined
  const per100 = used != null && c.km ? (used / c.km) * 100 : undefined
  const balance = (c.advance ?? 0) - spend

  return (
    <>
      <div className="mb-5">
        <StatGroup
          items={[
            {
              label: "Harcanan yakıt",
              value: used != null ? `${used} L` : "—",
              caption: per100 != null ? `${per100.toFixed(1).replace(".", ",")} L / 100 km` : "Çıkış ve dönüş litresi girilmeli",
            },
            { label: "Yapılan yol", value: c.km ? `${number(c.km)} km` : "—", caption: `${trip.from} → ${trip.to}` },
            { label: "Yol harcaması", value: money(spend), caption: `${c.expenses.length} kalem` },
            {
              label: "Avans mutabakatı",
              value: money(Math.abs(balance)),
              tone: balance < 0 ? "warning" : "positive",
              caption: balance > 0 ? "Şoförden iade alınacak" : balance < 0 ? "Şoföre ödenecek" : "Avans kapandı",
            },
          ]}
        />
      </div>

      <div className="mb-5">
        <Card
          title="Yakıt, kilometre ve avans"
          subtitle="Şoförün WhatsApp'tan ilettiği gösterge ve fiş fotoğraflarına göre girin. Sefer kapandıktan sonra da düzenlenebilir."
          action={!editing && editable ? <Button onClick={() => setEditing(true)}>Düzenle</Button> : undefined}
        >
          {editing && editable ? (
            <ClosingForm trip={trip} onDone={() => setEditing(false)} />
          ) : (
            <DescriptionList
              layout="grid"
              items={[
                { label: "Çıkışta depo", value: c.fuelOut != null ? `${c.fuelOut} L` : "—" },
                { label: "Dönüşte depo", value: c.fuelIn != null ? `${c.fuelIn} L` : "—" },
                { label: "Yolda alınan yakıt", value: `${c.fuelBought ?? 0} L` },
                { label: "Yapılan yol", value: c.km ? `${number(c.km)} km` : "—" },
                { label: "Sefer öncesi avans", value: money(c.advance ?? 0) },
                { label: "Not", value: c.note || "—" },
              ]}
            />
          )}
        </Card>
      </div>

      <div className="mb-5">
        <Card title="Yol harcamaları" subtitle="Yakıt hariç yolda yapılan tüm harcamalar (HGS, köprü, yemek, otopark, tamir...).">
          <div className="mt-3">
            {c.expenses.map((e) => (
              <ListItem
                key={e.id}
                variant="finance"
                title={e.name}
                description={formatDateNumeric(e.date)}
                trailing={
                  <>
                    {money(e.amount)}
                    {editable && (
                      <IconButton aria-label={`${e.name} sil`} icon={<Trash2Icon size={13} />} onClick={() => actions.removeExpense.mutate(e.id)} />
                    )}
                  </>
                }
              />
            ))}
            {!c.expenses.length && <p className="p-5 text-2xs text-ink-subtle">Henüz harcama girilmedi.</p>}
          </div>
          {editable && <ExpenseForm tripId={trip.id} />}
        </Card>
      </div>

      <Card
        title="Sevkiyat faturaları"
        subtitle="Bu sefere ait sevkiyat faturalarını PDF olarak yükleyin; sefer kapandıktan sonra da burada kalır."
        action={
          editable && (
            <FilePickButton
              accept="application/pdf,.pdf"
              multiple
              onFiles={(files) => actions.addInvoices.mutate(files.map((f) => ({ name: f.name, size: fileSize(f.size) })))}
            >
              PDF yükle
            </FilePickButton>
          )
        }
      >
        <div className="mt-3">
          {c.invoices.map((f) => (
            <ListItem
              key={f.id}
              leading={<IconTile shape="file" tone="sage" icon={<FileTextIcon size={21} />} />}
              title={f.name}
              description={`PDF · ${f.size} · ${formatDateNumeric(f.date)}`}
              trailing={
                editable && (
                  <Button size="sm" leftIcon={<Trash2Icon size={14} />} onClick={() => actions.removeInvoice.mutate(f.id)}>
                    Kaldır
                  </Button>
                )
              }
            />
          ))}
          {!c.invoices.length && <p className="p-5 text-2xs text-ink-subtle">Henüz sevkiyat faturası yüklenmedi.</p>}
        </div>
      </Card>
    </>
  )
}

function ClosingForm({ trip, onDone }: { trip: TripView; onDone: () => void }) {
  const c = trip.closing
  const actions = useTripActions(trip.id)
  const form = useZodForm(tripClosingSchema, {
    defaultValues: {
      fuelOut: c?.fuelOut ?? "",
      fuelIn: c?.fuelIn ?? "",
      fuelBought: c?.fuelBought ?? "",
      km: c?.km ?? "",
      advance: c?.advance ?? "",
      note: c?.note ?? "",
    } as never,
  })
  return (
    <Form
      form={form}
      className="p-5"
      onSubmit={(v) => actions.saveClosing.mutate(v, { onSuccess: onDone, onError: (e) => applyServerErrors(form as never, e) })}
    >
      <FormGrid>
        <FormInput name="fuelOut" label="Çıkışta depodaki yakıt (L)" type="number" min={0} />
        <FormInput name="fuelIn" label="Dönüşte depodaki yakıt (L)" type="number" min={0} />
      </FormGrid>
      <FormGrid>
        <FormInput name="fuelBought" label="Yolda alınan yakıt (L)" type="number" min={0} optional />
        <FormInput name="km" label="Yapılan yol (km)" type="number" min={0} />
      </FormGrid>
      <FormGrid>
        <FormInput name="advance" label="Sefer öncesi verilen avans (₺)" type="number" min={0} />
        <FormInput name="note" label="Not" placeholder="Örn. dönüşte boş geldi" />
      </FormGrid>
      <Button type="submit" variant="primary" leftIcon={<CheckIcon size={15} />} loading={actions.saveClosing.isPending}>
        Kaydet
      </Button>
    </Form>
  )
}

const EXPENSE_TYPES = ["Yemek", "HGS / köprü", "Otopark", "Konaklama", "Yıkama", "Tamir", "Hamaliye"]

function ExpenseForm({ tripId }: { tripId: string }) {
  const actions = useTripActions(tripId)
  const form = useZodForm(tripExpenseSchema, { defaultValues: { name: "Yemek", amount: "" as unknown as number } })
  return (
    <Form
      form={form}
      className="flex flex-wrap items-start gap-2 p-5"
      onSubmit={(v) =>
        actions.addExpense.mutate(v, {
          onSuccess: () => form.reset({ name: v.name, amount: "" as unknown as number }),
          onError: (e) => applyServerErrors(form as never, e),
        })
      }
    >
      <div className="min-w-[140px] flex-1">
        <FormInput name="name" label="Harcama kalemi" list="trip-expense-types" flush />
        <datalist id="trip-expense-types">
          {EXPENSE_TYPES.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      </div>
      <div className="min-w-[120px] flex-1">
        <FormInput name="amount" label="Tutar (₺)" type="number" min={1} placeholder="Tutar (₺)" flush />
      </div>
      <div className="pt-[25px]">
        <Button type="submit" variant="primary" leftIcon={<PlusIcon size={14} />} loading={actions.addExpense.isPending}>
          Harcama ekle
        </Button>
      </div>
    </Form>
  )
}

