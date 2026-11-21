"use client"

import { useState } from "react"
import {
  Alert,
  ArrowRightIcon,
  Badge,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Grid,
  IconTile,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  RefreshCwIcon,
  StatusIndicator,
  Switch,
  Timeline,
  WorkflowIcon,
  ZapIcon,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery } from "@/shared/api/query"
import { RULE_ACTIONS, RULE_CONDITIONS, RULE_OBJECTS, ruleCreateSchema, type AutomationRule, type RuleRun } from "@/shared/contracts/management"
import { applyServerErrors, Form, FormInput, FormSelect, useZodForm } from "@/shared/forms"
import { formatDateTime } from "@/shared/lib/format"

const KEY = ["automation"]

/** Otomasyon — kurallar veri olarak saklanır; motor çalıştırılınca görev & bildirim üretir (plan §6). */
export function AutomationScreen() {
  const { canDo } = useAccess()
  const rules = useApiQuery<AutomationRule[]>([...KEY, "rules"], "/automation/rules")
  const runs = useApiQuery<RuleRun[]>([...KEY, "runs"], "/automation/runs")
  const [creating, setCreating] = useState(false)
  const toggle = useApiMutation((v: { id: string; enabled: boolean }) => http.patch<AutomationRule>(`/automation/rules/${v.id}`, { enabled: v.enabled }), {
    invalidate: [KEY],
    success: (r) => (r.enabled ? `${r.name} etkinleştirildi.` : `${r.name} duraklatıldı.`),
  })
  const run = useApiMutation(() => http.post<{ created: number; nextRun: string }>("/automation/run"), {
    invalidate: [KEY, ["tasks"], ["notifications"]],
    success: (r) => `Kural motoru çalıştı · ${r.created} yeni görev oluşturuldu.`,
  })
  const canEdit = canDo("automation", "update")

  return (
    <>
      <ModuleWorkspace
        module="automation"
        customTabs={["Kurallarım", "Hazır kural kütüphanesi", "Çalıştırma geçmişi"]}
        actions={() => (
          <>
            {canEdit && (
              <Button leftIcon={<RefreshCwIcon size={15} />} loading={run.isPending} onClick={() => run.mutate()}>
                Şimdi çalıştır
              </Button>
            )}
            {canDo("automation", "create") && (
              <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(true)}>
                Kural oluştur
              </Button>
            )}
          </>
        )}
      >
        {(tab) =>
          tab === "Çalıştırma geçmişi" ? (
            <Card title="Kural motoru geçmişi" subtitle="Her gün 08:00'de ve 'Şimdi çalıştır' ile çalışır." padding="md">
              {runs.data?.length ? (
                <Timeline
                  items={runs.data.map((r) => ({
                    time: `${formatDateTime(r.ranAt)} · ${r.status}`,
                    title: r.ruleName,
                    description: r.result,
                  }))}
                />
              ) : (
                <EmptyState title="Henüz çalıştırma yok" />
              )}
            </Card>
          ) : (
            <>
              <div className="mb-5">
                <Alert tone="info" icon={<ZapIcon size={20} />} title={tab === "Kurallarım" ? "Kurallarınız her gün otomatik çalışır." : "Lojistiğe özgü hazır kurallar"}>
                  Nesne + koşul + eşik + eylem. Eşiği aşan kayıtlar için görev açılır ve sorumluya bildirim gider.
                </Alert>
              </div>
              <Grid layout="cols-2">
                {(rules.data ?? [])
                  .filter((r) => (tab === "Kurallarım" ? true : r.library))
                  .map((r) => (
                    <Card key={r.id}>
                      <div className="flex items-center justify-between px-[22px] pt-[22px]">
                        <IconTile tone="sage" icon={<WorkflowIcon size={18} />} />
                        <Switch
                          checked={r.enabled}
                          disabled={!canEdit}
                          aria-label={`${r.name} aktif`}
                          onCheckedChange={(enabled) => toggle.mutate({ id: r.id, enabled })}
                        />
                      </div>
                      <div className="px-[22px] py-5">
                        <h3 className="mb-[22px] text-md font-semibold text-ink-heading">{r.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 rounded-md bg-sage-50 p-3">
                          <Badge tone="blue" dot={false}>EĞER</Badge>
                          <p className="text-2xs leading-normal text-sage-600">
                            {r.object} · {r.conditionText}
                          </p>
                          <ArrowRightIcon size={15} className="text-sage-subtle" />
                          <Badge tone="green" dot={false}>O ZAMAN</Badge>
                          <p className="text-2xs leading-normal text-sage-600">{r.action}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-sage-200 bg-sage-25 px-[22px] py-3.5 text-3xs text-sage-subtle">
                        <StatusIndicator size="sm" status={r.enabled ? "live" : "off"} label={r.enabled ? "Aktif" : "Duraklatıldı"} />
                        <span>Son çalışma: {r.lastRunAt ? formatDateTime(r.lastRunAt) : "—"}</span>
                      </div>
                    </Card>
                  ))}
              </Grid>
            </>
          )
        }
      </ModuleWorkspace>
      {creating && <RuleModal onClose={() => setCreating(false)} />}
    </>
  )
}

function RuleModal({ onClose }: { onClose: () => void }) {
  const form = useZodForm(ruleCreateSchema, {
    defaultValues: { name: "", object: "Belge", condition: "Bitişine kalan gün", threshold: 15, action: "Görev oluştur & sorumluya bildir" },
  })
  const create = useApiMutation((v: unknown) => http.post<AutomationRule>("/automation/rules", v), {
    invalidate: [KEY],
    toastError: false,
    success: "Otomasyon kuralı oluşturuldu.",
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Yeni otomasyon kuralı" subtitle="Nesne + koşul + eşik + eylem">
      <Form form={form} onSubmit={(v) => create.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          <FormInput name="name" label="Kural adı" autoFocus required />
          <FormGrid>
            <FormSelect name="object" label="Nesne" options={[...RULE_OBJECTS]} />
            <FormSelect name="condition" label="Koşul" options={[...RULE_CONDITIONS]} />
          </FormGrid>
          <FormGrid>
            <FormInput name="threshold" label="Eşik değeri" type="number" min={0} required />
            <FormSelect name="action" label="Eylem" options={[...RULE_ACTIONS]} />
          </FormGrid>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Kuralı oluştur
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}
