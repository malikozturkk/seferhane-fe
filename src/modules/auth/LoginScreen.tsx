"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Alert, Avatar, Brand, Button, Card, EmptyState, SkeletonGroup, Building2Icon } from "@/design-system"
import { useMe } from "@/app-shell/session"
import { http, ApiClientError } from "@/shared/api/http"
import { useApiQuery, useApiMutation } from "@/shared/api/query"
import { loginSchema, type DemoAccount, type Me, type TenantPublic } from "@/shared/contracts/tenancy"
import { applyServerErrors, Form, FormInput, useZodForm } from "@/shared/forms"
import { DEMO_PASSWORD_HINT } from "./constants"

interface TenantInfo {
  tenant: TenantPublic | null
  platform: boolean
  demoAccounts: DemoAccount[]
}

/** Login for both tenant hosts and the platform console host. */
export function LoginScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const qc = useQueryClient()
  const { data: info, error, isLoading } = useApiQuery<TenantInfo>(["tenant-public"], "/tenant")
  const { data: me } = useMe()
  const form = useZodForm(loginSchema, { defaultValues: { email: "", password: "" } })

  const destination = (m: Me) => {
    const next = params.get("next")
    if (next && next.startsWith("/") && !next.startsWith("//")) return next
    return m.user.kind === "external" ? "/portal" : "/"
  }

  // Already signed in → continue.
  useEffect(() => {
    if (me) router.replace(destination(me))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])

  const login = useApiMutation((v: { email: string; password: string }) => http.post<Me>("/auth/login", v), {
    toastError: false,
    onSuccess: (m) => {
      qc.setQueryData(["me"], m)
      router.replace(destination(m))
    },
  })

  if (isLoading) return <Centered><SkeletonGroup /></Centered>
  if (error instanceof ApiClientError && error.status === 404) {
    return (
      <Centered>
        <EmptyState
          icon={<Building2Icon size={24} />}
          title="Çalışma alanı bulunamadı"
          description="Bu adrese bağlı bir Seferhane çalışma alanı yok. Adresi kontrol edin veya yöneticinizden davet bağlantısı isteyin."
        />
      </Centered>
    )
  }

  const title = info?.platform ? "Platform konsolu" : info?.tenant?.name
  return (
    <Centered>
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Brand label={info?.platform ? "admin" : undefined} />
        <p className="text-xs text-ink-muted">Sefer planından kâra kadar, lojistiğin tamamı tek ekranda.</p>
      </div>
      <Card title={`${title} · Giriş`} subtitle="Şirket e-posta adresiniz ve şifrenizle giriş yapın." padding="md">
        <Form
          form={form}
          onSubmit={(values) =>
            login.mutate(values, { onError: (e) => applyServerErrors(form as never, e) })
          }
        >
          <FormInput name="email" label="E-posta" type="email" autoComplete="username" autoFocus required />
          <FormInput name="password" label="Şifre" type="password" autoComplete="current-password" required />
          {login.error && !(login.error instanceof ApiClientError && Object.keys(login.error.fieldErrors).length) && (
            <div className="mb-4">
              <Alert tone="error" title="Giriş yapılamadı">
                {login.error.message}
              </Alert>
            </div>
          )}
          <Button type="submit" variant="primary" fullWidth size="lg" loading={login.isPending}>
            Giriş yap
          </Button>
        </Form>
      </Card>

      {!!info?.demoAccounts.length && (
        <div className="mt-5">
          <Card title="Demo hesaplar" subtitle={`Her rolü deneyin · şifre: ${DEMO_PASSWORD_HINT}`}>
            <ul className="py-2">
              {info.demoAccounts.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-row-hover"
                    onClick={() => login.mutate({ email: a.email, password: DEMO_PASSWORD_HINT })}
                  >
                    <Avatar name={a.name} size="sm" />
                    <span className="flex-1">
                      <strong className="block text-sm font-medium text-ink-emphasis">{a.name}</strong>
                      <span className="text-2xs text-ink-muted">{a.email}</span>
                    </span>
                    <span className="text-2xs text-ink-subtle">{a.roleName}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full items-start justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  )
}
