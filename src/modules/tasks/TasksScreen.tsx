"use client"

import { useState } from "react"
import {
  Avatar,
  Button,
  Checkbox,
  DataTable,
  DescriptionList,
  EmptyState,
  FormGrid,
  ListTodoIcon,
  IconTile,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  Select,
  TableCellEntity,
  Textarea,
} from "@/design-system"
import { ModuleWorkspace } from "@/app-shell/ModuleWorkspace"
import { useAccess } from "@/app-shell/session"
import { useStaffNames } from "@/entities/lookups"
import { RecordCreateModal, RecordDetailModal, RecordsTable } from "@/entities/record/RecordsPanel"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import type { StatCard } from "@/shared/contracts/common"
import { TASK_PRIORITIES, TASK_STATUSES, taskCreateSchema, type TaskView } from "@/shared/contracts/management"
import type { WorkRecord } from "@/shared/contracts/resources"
import { applyServerErrors, Form, FormDate, FormInput, FormSelect, FormTextarea, useZodForm } from "@/shared/forms"
import { addDays, today } from "@/shared/lib/clock"
import { exportCSV } from "@/shared/lib/csv"
import { formatDate, relativeDay } from "@/shared/lib/format"
import { EntityTimeline } from "@/shared/ui/EntityTimeline"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import type { useListState } from "@/shared/ui/useListState"

const KEY = ["tasks"]

export function TasksScreen() {
  const { canDo } = useAccess()
  const [creating, setCreating] = useState<string | null>(null)
  const [task, setTask] = useState<TaskView | null>(null)
  const [record, setRecord] = useState<WorkRecord | null>(null)
  const stats = useApiQuery<StatCard[]>([...KEY, "stats"], "/tasks/stats")
  const all = useListQuery<TaskView>(KEY, "/tasks", { pageSize: 500, tab: "Tüm görevler" })

  return (
    <>
      <ModuleWorkspace
        module="tasks"
        stats={stats.data}
        actions={(tab) =>
          canDo("tasks", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setCreating(tab)}>
              {tab === "İş akışı şablonları" ? "Şablon oluştur" : "Görev oluştur"}
            </Button>
          )
        }
        onExport={() =>
          exportCSV(
            [["Görev", "İlişkili", "Sorumlu", "Son tarih", "Durum"], ...(all.data?.items ?? []).map((t) => [t.title, t.relatedRef, t.assigneeName, t.dueDate, t.displayStatus])],
            "seferhane-gorevler",
          )
        }
      >
        {(tab, list) =>
          tab === "İş akışı şablonları" ? (
            <RecordsTable kind="tasks.template" params={list.params} page={list.page} onPage={list.setPage} onOpen={setRecord} />
          ) : (
            <TaskTable tab={tab} list={list} onOpen={setTask} />
          )
        }
      </ModuleWorkspace>
      {creating === "İş akışı şablonları" && <RecordCreateModal kind="tasks.template" open onClose={() => setCreating(null)} />}
      {creating && creating !== "İş akışı şablonları" && <TaskModal onClose={() => setCreating(null)} />}
      {task && <TaskDetail task={task} onClose={() => setTask(null)} />}
      <RecordDetailModal record={record} onClose={() => setRecord(null)} moduleName="Görev & iş akışı" />
    </>
  )
}

function TaskTable({ tab, list, onOpen }: { tab: string; list: ReturnType<typeof useListState>; onOpen: (t: TaskView) => void }) {
  const { data } = useListQuery<TaskView>(KEY, "/tasks", { ...list.params, tab })
  return (
    <DataTable<TaskView>
      aria-label="Görevler"
      data={data?.items ?? []}
      getRowId={(t) => t.id}
      onRowClick={onOpen}
      selectable
      minWidth={680}
      sort={list.tableSort}
      onSortChange={list.onTableSort}
      empty={<EmptyState title="Görev bulunamadı" description="Bu sekmede açık görev yok." />}
      footer={<ListFooter total={data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="görev" />}
      columns={[
        {
          key: "title",
          header: "Görev",
          sortValue: (t) => t.title,
          cell: (t) => <TableCellEntity leading={<IconTile tone="sage" size="sm" icon={<ListTodoIcon size={16} />} />} title={t.title} subtitle={t.source ?? t.description} />,
        },
        { key: "ref", header: "İlişkili kayıt", hideOnMobile: true, cell: (t) => t.relatedRef },
        {
          key: "assignee",
          header: "Sorumlu",
          sortValue: (t) => t.assigneeName,
          cell: (t) => (
            <span className="flex items-center gap-[7px]">
              <Avatar name={t.assigneeName} size="sm" />
              {t.assigneeName}
            </span>
          ),
        },
        { key: "dueDate", header: "Son tarih", sortValue: (t) => t.dueDate, cell: (t) => (t.dueDate === today() ? `Bugün${t.dueTime ? `, ${t.dueTime}` : ""}` : formatDate(t.dueDate)) },
        { key: "status", header: "Durum", cell: (t) => <StatusBadge status={t.displayStatus} /> },
      ]}
    />
  )
}

function TaskModal({ onClose }: { onClose: () => void }) {
  const staff = useStaffNames()
  const [steps, setSteps] = useState("")
  const form = useZodForm(taskCreateSchema, {
    defaultValues: { title: "", description: "", relatedRef: "", assigneeName: "", dueDate: addDays(today(), 2), priority: "Normal", checklist: [] },
  })
  const create = useApiMutation((v: unknown) => http.post<TaskView>("/tasks", v), {
    invalidate: [KEY],
    toastError: false,
    success: (t) => `${t.title} görevi oluşturuldu.`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Görev oluştur" subtitle="Her işin bir sahibi, her adımın bir zamanı var.">
      <Form
        form={form}
        onSubmit={(v) =>
          create.mutate(
            { ...v, assigneeName: v.assigneeName || staff[0], checklist: steps.split("\n").map((s) => s.trim()).filter(Boolean) },
            { onError: (e) => applyServerErrors(form as never, e) },
          )
        }
      >
        <ModalBody>
          <FormInput name="title" label="Görev başlığı" autoFocus required />
          <FormGrid>
            <FormSelect name="assigneeName" label="Sorumlu" options={staff} />
            <FormDate name="dueDate" label="Son tarih" min={today()} />
          </FormGrid>
          <FormGrid>
            <FormSelect name="priority" label="Öncelik" options={[...TASK_PRIORITIES]} />
            <FormInput name="relatedRef" label="İlişkili kayıt" placeholder="SFR-2026-0842, 34 HZN 614…" optional />
          </FormGrid>
          <FormTextarea name="description" label="Açıklama" rows={2} />
          <label className="mb-2 block text-xs font-medium text-ink-label" htmlFor="task-steps">
            Kontrol listesi <small className="font-normal text-ink-subtle">(her satır bir madde)</small>
          </label>
          <Textarea id="task-steps" rows={3} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Belge toplandı&#10;Müşteri bilgilendirildi" />
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Görevi oluştur
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

function TaskDetail({ task, onClose }: { task: TaskView; onClose: () => void }) {
  const { canDo } = useAccess()
  const staff = useStaffNames()
  const [current, setCurrent] = useState(task)
  const update = useApiMutation((v: Partial<TaskView>) => http.patch<TaskView>(`/tasks/${task.id}`, v), {
    invalidate: [KEY],
    onSuccess: setCurrent,
  })
  const complete = useApiMutation(() => http.patch<TaskView>(`/tasks/${task.id}`, { status: "Tamamlandı" }), {
    invalidate: [KEY],
    success: "Görev tamamlandı ve işlem geçmişine eklendi.",
    onSuccess: onClose,
  })
  const editable = canDo("tasks", "update")
  return (
    <Modal open onClose={onClose} size="lg" title={current.title} subtitle={`${current.relatedRef} · Görev & iş akışı`}>
      <ModalBody>
        <div className="flex justify-between text-xs">
          <StatusBadge status={current.displayStatus} />
          <span className="text-ink-subtle">
            Son tarih: {relativeDay(current.dueDate)}
            {current.dueTime ? `, ${current.dueTime}` : ""}
          </span>
        </div>
        <DescriptionList
          layout="grid"
          className="!px-0"
          items={[
            { label: "Açıklama", value: current.description || current.source || "—" },
            { label: "Öncelik", value: current.priority },
            { label: "Kaynak", value: current.source ?? "Manuel" },
            { label: "Oluşturulma", value: formatDate(current.createdAt) },
          ]}
        />
        {editable && current.status !== "Tamamlandı" && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select aria-label="Sorumlu" value={current.assigneeName} onChange={(e) => update.mutate({ assigneeName: e.target.value })} options={staff} />
            <Select
              aria-label="Durum"
              value={current.status}
              onChange={(e) => update.mutate({ status: e.target.value as TaskView["status"] })}
              options={TASK_STATUSES.filter((s) => s !== "Tamamlandı").map((s) => s)}
            />
          </div>
        )}
        {current.checklist.length > 0 && (
          <>
            <h3 className="mb-3 text-sm font-semibold-soft text-ink-heading">Kontrol listesi</h3>
            <div className="flex flex-col gap-3">
              {current.checklist.map((c, i) => (
                <Checkbox
                  key={c.label}
                  variant="task"
                  label={c.label}
                  checked={c.done}
                  disabled={!editable}
                  onChange={(e) => update.mutate({ checklist: current.checklist.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)) })}
                />
              ))}
            </div>
          </>
        )}
        <EntityTimeline type="task" id={current.id} label={current.title} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Kapat</Button>
        {editable && current.status !== "Tamamlandı" && (
          <Button variant="primary" loading={complete.isPending} onClick={() => complete.mutate()}>
            {current.status === "Onay bekliyor" ? "Onayla / Tamamla" : "Tamamlandı"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
