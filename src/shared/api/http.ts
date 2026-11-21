/**
 * HTTP client for the Seferhane API. The only place that knows the base URL.
 * Switching to the real backend = setting NEXT_PUBLIC_API_URL.
 */
import type { ProblemDetails } from "../contracts/common"

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public problem: ProblemDetails,
  ) {
    super(problem.detail ?? problem.title)
  }
  get fieldErrors() {
    return this.problem.errors ?? {}
  }
}

type Query = Record<string, string | number | boolean | undefined | null>

function buildUrl(path: string, query?: Query) {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v))
  const s = qs.toString()
  return s ? `${url}?${s}` : url
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const res = await fetch(buildUrl(path, query), {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const problem: ProblemDetails = data ?? { type: "about:blank", title: "İstek başarısız", status: res.status }
    throw new ApiClientError(res.status, problem)
  }
  return data as T
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  delete: <T>(path: string) => request<T>("DELETE", path),
}

export const errorMessage = (e: unknown) =>
  e instanceof ApiClientError ? (e.problem.detail ?? e.problem.title) : "Beklenmeyen bir hata oluştu."
