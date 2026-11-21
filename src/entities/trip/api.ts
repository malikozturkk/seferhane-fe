"use client"

import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import type { Activity, Comment, ListParams, StatCard } from "@/shared/contracts/common"
import type { ClaimView } from "@/shared/contracts/management"
import type {
  TripClosingInput,
  TripCostInput,
  TripCreateInput,
  TripExpenseInput,
  TripStatus,
  TripView,
} from "@/shared/contracts/operations"
import type { Employee, Vehicle } from "@/shared/contracts/resources"

export const tripKeys = { all: ["trips"] as const, detail: (id: string) => ["trips", "detail", id] as const }

export interface TripDetail {
  trip: TripView
  vehicle: Vehicle | null
  driver: Employee | null
  claims: ClaimView[]
  activities: Activity[]
  comments: Comment[]
}

export const useTrips = (params: ListParams & { date?: string }, enabled = true) =>
  useListQuery<TripView>(tripKeys.all, "/trips", params, enabled)

export const useTripStats = () => useApiQuery<StatCard[]>([...tripKeys.all, "stats"], "/trips/stats")

export const useTrip = (id: string) => useApiQuery<TripDetail>(tripKeys.detail(id), `/trips/${id}`)

/** Every trip mutation refreshes trips + dependent views (dashboard, planning, tasks). */
const INVALIDATE = [tripKeys.all, ["dashboard"], ["planning"], ["tasks"], ["timeline"], ["invoices"]]

export const useCreateTrip = () =>
  useApiMutation((v: TripCreateInput & { quoteId?: string }) => http.post<TripView>("/trips", v), {
    invalidate: [...INVALIDATE, ["quotes"], ["customers"]],
    toastError: false,
    success: "Sefer oluşturuldu. Belge ve görev şablonları dosyaya eklendi.",
  })

export function useTripActions(id: string) {
  const base = `/trips/${id}`
  return {
    setStatus: useApiMutation((status: TripStatus) => http.patch<TripView>(`${base}/status`, { status }), {
      invalidate: INVALIDATE,
      success: (_r, s) => `Sefer durumu: ${s}`,
    }),
    close: useApiMutation(() => http.post<TripView>(`${base}/close`), {
      invalidate: INVALIDATE,
      success: "Dosya kapatıldı. Fatura hazırlığına eklendi.",
    }),
    uploadDocument: useApiMutation(
      (v: { name: string; fileName: string; size?: string }) => http.post<TripView>(`${base}/documents`, v),
      { invalidate: INVALIDATE, success: (_r, v) => `${v.name} dosyaya eklendi. Kaynak: WhatsApp fotoğrafı.` },
    ),
    addCost: useApiMutation((v: TripCostInput) => http.post<TripView>(`${base}/costs`, v), {
      invalidate: INVALIDATE,
      toastError: false,
      success: "Gider eklendi. Sefer kârı güncellendi.",
    }),
    toggleCheck: useApiMutation((v: { index: number; done: boolean }) => http.patch<TripView>(`${base}/checklist`, v), {
      invalidate: [tripKeys.detail(id)],
    }),
    saveClosing: useApiMutation((v: TripClosingInput) => http.put<TripView>(`${base}/closing`, v), {
      invalidate: INVALIDATE,
      toastError: false,
      success: "Sefer kapanış bilgileri kaydedildi.",
    }),
    addExpense: useApiMutation((v: TripExpenseInput) => http.post<TripView>(`${base}/closing/expenses`, v), {
      invalidate: [tripKeys.detail(id)],
      toastError: false,
      success: "Yol harcaması sefere eklendi.",
    }),
    removeExpense: useApiMutation((itemId: string) => http.delete<TripView>(`${base}/closing/expenses/${itemId}`), {
      invalidate: [tripKeys.detail(id)],
    }),
    addInvoices: useApiMutation(
      (files: Array<{ name: string; size: string }>) => http.post<TripView>(`${base}/closing/invoices`, { files }),
      { invalidate: [tripKeys.detail(id)], success: (_r, f) => `${f.length} sevkiyat faturası sefere eklendi.` },
    ),
    removeInvoice: useApiMutation((itemId: string) => http.delete<TripView>(`${base}/closing/invoices/${itemId}`), {
      invalidate: [tripKeys.detail(id)],
    }),
  }
}

export const fileSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
