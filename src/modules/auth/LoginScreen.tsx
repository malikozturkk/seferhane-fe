"use client"

import { useSearchParams } from "next/navigation"
import { useState, type ReactNode } from "react"
import { Alert, Brand, Building2Icon, Card, ChevronRightIcon, IconTile, ListItem } from "@/design-system"
import { Button } from "@/design-system"
import { http, ApiClientError } from "@/shared/api/http"
import { useApiMutation } from "@/shared/api/query"
import { loginSchema, type LoginResult, type LoginWorkspace } from "@/shared/contracts/tenancy"
import { applyServerErrors, Form, FormInput, useZodForm } from "@/shared/forms"

const KIND_LABEL: Record<LoginWorkspace["kind"], string> = {
  panel: "Şirket paneli",
  portal: "Müşteri portalı",
  platform: "Seferhane konsolu",
}

/**
 * Central sign-in at seferhane.com/login. After the credentials are verified
 * the user is sent to their own workspace subdomain (or asked to pick one when
 * the e-mail belongs to several workspaces).
 */
export function LoginScreen() {
  const params = useSearchParams()
  const next = params.get("next")
  const form = useZodForm(loginSchema, { defaultValues: { email: "", password: "" } })
  const [choices, setChoices] = useState<LoginWorkspace[] | null>(null)

  const login = useApiMutation(
    (v: { email: string; password: string }) =>
      http.post<LoginResult>(`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`, v),
    {
      toastError: false,
      onSuccess: ({ workspaces }) => {
        if (workspaces.length === 1) window.location.assign(workspaces[0].url)
        else setChoices(workspaces)
      },
    },
  )

  const fieldError = login.error instanceof ApiClientError && Object.keys(login.error.fieldErrors).length > 0
  const handoffFailed = params.get("error") === "handoff" && !login.error

  return (
    <Centered>
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Brand />
        <p className="text-xs text-ink-muted">Sefer planından kâra kadar, lojistiğin tamamı tek ekranda.</p>
      </div>

      {choices ? (
        <Card title="Çalışma alanı seçin" subtitle="Bu e-posta birden fazla çalışma alanına bağlı.">
          <ul className="py-2">
            {choices.map((w) => (
              <li key={w.url}>
                <a href={w.url} className="block hover:bg-surface-row-hover">
                  <ListItem
                    variant="simple"
                    leading={<IconTile icon={<Building2Icon size={16} />} tone="green" size="sm" />}
                    title={w.name}
                    description={`${KIND_LABEL[w.kind]} · ${w.host}`}
                    trailing={<ChevronRightIcon size={15} />}
                  />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card title="Giriş yap" subtitle="E-posta adresiniz ve şifrenizle giriş yapın." padding="md">
          <Form form={form} onSubmit={(values) => login.mutate(values, { onError: (e) => applyServerErrors(form as never, e) })}>
            <FormInput name="email" label="E-posta" type="email" autoComplete="username" autoFocus required />
            <FormInput name="password" label="Şifre" type="password" autoComplete="current-password" required />
            {(handoffFailed || (login.error && !fieldError)) && (
              <div className="mb-4">
                <Alert tone="error" title="Giriş yapılamadı">
                  {handoffFailed ? "Giriş bağlantısının süresi doldu. Lütfen tekrar giriş yapın." : login.error?.message}
                </Alert>
              </div>
            )}
            <Button type="submit" variant="primary" fullWidth size="lg" loading={login.isPending || login.isSuccess}>
              Giriş yap
            </Button>
          </Form>
        </Card>
      )}
    </Centered>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen w-full items-start justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  )
}
