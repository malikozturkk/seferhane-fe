"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useWatch } from "react-hook-form"
import {
  Alert,
  ArrowRightIcon,
  Button,
  CheckIcon,
  FormGrid,
  Modal,
  ModalBody,
  ModalFooter,
  ShieldCheckIcon,
  SparklesIcon,
  Stepper,
} from "@/design-system"
import { fleetVehicles, useCustomerOptions, useVehicleOptions } from "@/entities/lookups"
import { useApiQuery } from "@/shared/api/query"
import { OPERATION_TYPES, tripCreateSchema, type AssignmentCheck, type TripCreateInput } from "@/shared/contracts/operations"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, FormTextarea, useZodForm } from "@/shared/forms"
import { today } from "@/shared/lib/clock"
import { ApiClientError } from "@/shared/api/http"
import { useCreateTrip } from "./api"

export interface NewTripDefaults extends Partial<TripCreateInput> {
  quoteId?: string
}

const STEP1: Array<keyof TripCreateInput> = ["customerId", "operationType", "from", "to", "date", "time"]

/** "Yeni sefer oluştur" — two-step flow from the Make prototype (bilgiler → kaynak & onay). */
export function NewTripModal({ open, onClose, defaults }: { open: boolean; onClose: () => void; defaults?: NewTripDefaults }) {
  if (!open) return null
  return <NewTripForm onClose={onClose} defaults={defaults} />
}

function NewTripForm({ onClose, defaults }: { onClose: () => void; defaults?: NewTripDefaults }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const customers = useCustomerOptions()
  const vehicles = useVehicleOptions()
  const create = useCreateTrip()
  const form = useZodForm(tripCreateSchema, {
    defaultValues: {
      customerId: defaults?.customerId ?? "",
      operationType: defaults?.operationType ?? "Yurt içi · Komple",
      from: defaults?.from ?? "İstanbul",
      to: defaults?.to ?? "Ankara",
      date: defaults?.date ?? today(),
      time: defaults?.time ?? "14:30",
      cargoDescription: defaults?.cargoDescription ?? "",
      vehicleId: "",
      revenue: defaults?.revenue ?? 24500,
    },
  })
  const [customerId, from, to, type, time, date, vehicleId] = useWatch({
    control: form.control,
    name: ["customerId", "from", "to", "operationType", "time", "date", "vehicleId"],
  })
  const fleet = fleetVehicles(vehicles.data?.items)
  const check = useApiQuery<AssignmentCheck>(["planning", "check"], "/planning/check", { vehicleId, date, time }, { enabled: step === 1 && !!vehicleId })
  const customerName = customers.data?.items.find((c) => c.id === customerId)?.name

  const next = async () => {
    if (await form.trigger(STEP1)) {
      if (!form.getValues("vehicleId")) form.setValue("vehicleId", fleet.find((v) => v.status === "Müsait")?.id ?? fleet[0]?.id ?? "")
      setStep(1)
    }
  }

  const submit = (values: TripCreateInput) =>
    create.mutate(
      { ...values, quoteId: defaults?.quoteId } as TripCreateInput & { quoteId?: string },
      {
        onSuccess: (trip) => {
          onClose()
          router.push(`/operations/${trip.id}`)
        },
        onError: (e) => {
          if (!applyServerErrors(form as never, e) && e instanceof ApiClientError) form.setError("root", { message: e.message })
        },
      },
    )

  const blocked = check.data && !check.data.ok
  const rootError = form.formState.errors.root?.message

  return (
    <Modal open onClose={onClose} title="Yeni sefer oluştur" subtitle="Operasyonunuzu birkaç adımda planlayın.">
      <div className="px-6 pt-[22px]">
        <Stepper variant="compact" current={step} steps={["Sefer bilgileri", "Kaynak & onay"]} aria-label="Adımlar" />
      </div>
      <Form form={form} onSubmit={(v) => submit(v as TripCreateInput)}>
        <ModalBody>
          <div hidden={step !== 0}>
            <FormSelect
              name="customerId"
              label="Müşteri"
              placeholder="Müşteri seçin"
              options={(customers.data?.items ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
            <FormSelect name="operationType" label="Operasyon tipi" options={[...OPERATION_TYPES]} />
            <FormGrid>
              <FormInput name="from" label="Yükleme şehri" />
              <FormInput name="to" label="Teslimat şehri" />
            </FormGrid>
            <FormGrid>
              <FormDate name="date" label="Teslimat tarihi" min={today()} />
              <FormDate name="time" label="Planlanan teslim saati" mode="time" />
            </FormGrid>
            <FormTextarea name="cargoDescription" label="Yük açıklaması" rows={2} placeholder="Yük tipi, tonaj, palet adedi, taşıma notları..." />
          </div>
          <div hidden={step !== 1}>
            <div className="mb-[22px] rounded-lg border border-sage-200 bg-sage-50 p-[17px]">
              <strong className="text-base font-medium text-sage-600">{customerName ?? "—"}</strong>
              <p className="mt-[9px] text-xs text-sage-subtle">
                {from} → {to} · {type} · {time}
              </p>
            </div>
            <FormSelect
              name="vehicleId"
              label="Araç & şoför"
              options={fleet.map((v) => ({
                value: v.id,
                label: `${v.plate} · ${v.driverName ?? "Şoför atanmamış"}${v.status === "Bakımda" ? " (bakımda)" : ""}`,
              }))}
            />
            <FormInput name="revenue" label="Navlun geliri (₺)" type="number" min={1} />
            <Alert
              tone={blocked || rootError ? "error" : "success"}
              icon={<ShieldCheckIcon size={22} />}
              title={rootError ? "Uygunluk kontrolü başarısız" : check.data?.title ?? "Otomatik kontroller hazır"}
            >
              {rootError ?? check.data?.detail ?? "Araç ve şoför belgeleri, uygunluk ve çakışmalar atama anında doğrulanır."}
            </Alert>
            <div className="flex gap-2.5 pt-[22px] text-sage-subtle">
              <SparklesIcon size={17} className="mt-0.5 shrink-0" />
              <div>
                <strong className="text-xs font-medium text-sage-500">{type} şablonu uygulanacak</strong>
                <p className="mt-[5px] text-2xs leading-relaxed text-sage-subtle">
                  4 zorunlu belge ve 3 kontrol görevi oluşturulur. Sefer bilgisi şoföre WhatsApp&apos;tan iletilir.
                </p>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={step === 0 ? onClose : () => setStep(0)}>{step === 0 ? "Vazgeç" : "Geri"}</Button>
          {step === 0 ? (
            <Button variant="primary" rightIcon={<ArrowRightIcon size={15} />} onClick={next}>
              Kaynak atamaya geç
            </Button>
          ) : (
            <Button type="submit" variant="primary" rightIcon={<CheckIcon size={15} />} loading={create.isPending} disabled={blocked}>
              Seferi oluştur
            </Button>
          )}
        </ModalFooter>
      </Form>
    </Modal>
  )
}
