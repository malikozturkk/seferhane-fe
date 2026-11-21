"use client"

import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { useToast } from "@/design-system"
import type { ListParams, Paginated } from "../contracts/common"
import { ApiClientError, errorMessage, http } from "./http"

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => !(error instanceof ApiClientError && error.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  })
}

/** GET a resource. `path` doubles as the query key root. */
export function useApiQuery<T>(
  key: QueryKey,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<T, Error>({
    queryKey: query ? [...key, query] : key,
    queryFn: () => http.get<T>(path, query),
    ...options,
  })
}

/** Paginated list with search/tab/sort params. */
export function useListQuery<T>(key: QueryKey, path: string, params: ListParams, enabled = true) {
  return useQuery<Paginated<T>, Error>({
    queryKey: [...key, "list", params],
    queryFn: () => http.get<Paginated<T>>(path, params as Record<string, string | number>),
    placeholderData: (prev) => prev,
    enabled,
  })
}

interface MutationOptions<TVars, TResult> {
  /** Query key roots to invalidate after success (`["trips"]`, `["me"]`…). */
  invalidate?: QueryKey[]
  /** Toast shown on success (string or builder). */
  success?: string | ((result: TResult, vars: TVars) => string)
  /** Show API error as toast (default true). Set false when the form shows field errors. */
  toastError?: boolean
  onSuccess?: (result: TResult, vars: TVars) => void
}

/** POST/PATCH/DELETE with invalidation + toast, the standard write path. */
export function useApiMutation<TVars = void, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  { invalidate = [], success, toastError = true, onSuccess }: MutationOptions<TVars, TResult> = {},
) {
  const qc = useQueryClient()
  const { notify } = useToast()
  return useMutation<TResult, Error, TVars>({
    mutationFn: fn,
    onSuccess: async (result, vars) => {
      await Promise.all([...invalidate, ["me"]].map((k) => qc.invalidateQueries({ queryKey: k })))
      if (success) notify(typeof success === "function" ? success(result, vars) : success)
      onSuccess?.(result, vars)
    },
    onError: (error) => {
      const hasFieldErrors = error instanceof ApiClientError && Object.keys(error.fieldErrors).length > 0
      if (toastError && !hasFieldErrors) notify(errorMessage(error), { tone: "error" })
    },
  })
}
