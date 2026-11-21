"use client"

/** Small read-only lookups used by forms across modules (selects). */
import { useApiQuery } from "@/shared/api/query"
import type { Paginated } from "@/shared/contracts/common"
import type { Customer } from "@/shared/contracts/commercial"
import type { Employee, Vehicle } from "@/shared/contracts/resources"
import type { User } from "@/shared/contracts/tenancy"

const ALL = { pageSize: 500 }

export const useCustomerOptions = () =>
  useApiQuery<Paginated<Customer>>(["customers", "lookup"], "/customers", ALL, { staleTime: 60_000 })

export const useVehicleOptions = () =>
  useApiQuery<Paginated<Vehicle>>(["vehicles", "lookup"], "/vehicles", ALL, { staleTime: 30_000 })

export const useEmployeeOptions = (opts: { role?: string; active?: boolean } = {}) =>
  useApiQuery<Paginated<Employee>>(
    ["employees", "lookup", opts.role ?? "", opts.active ? 1 : 0],
    "/employees",
    { ...ALL, role: opts.role, active: opts.active ? 1 : undefined },
    { staleTime: 30_000 },
  )

/** Office users for "Sorumlu" selects. Falls back to staff employees if the user list is not visible. */
export function useStaffNames(): string[] {
  const users = useApiQuery<Paginated<User>>(["users", "lookup"], "/settings/users", ALL, { retry: false, staleTime: 60_000 })
  const employees = useEmployeeOptions({ active: true })
  const fromUsers = users.data?.items.filter((u) => u.kind === "internal" && u.status === "Aktif").map((u) => u.name)
  if (fromUsers?.length) return fromUsers
  return employees.data?.items.filter((e) => e.role !== "Şoför").map((e) => e.name) ?? []
}

export const fleetVehicles = (vehicles?: Vehicle[]) => (vehicles ?? []).filter((v) => v.kind !== "Hizmet aracı")
