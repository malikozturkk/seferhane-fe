"use client"

import { useState } from "react"
import { useWatch } from "react-hook-form"
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  CopyIcon,
  DataTable,
  EmptyState,
  FormGrid,
  LockIcon,
  Modal,
  ModalBody,
  ModalFooter,
  PlusIcon,
  SearchInput,
  Select,
  Tabs,
  TableCellEntity,
  Toolbar,
  Trash2Icon,
} from "@/design-system"
import { useAccess } from "@/app-shell/session"
import { useCustomerOptions } from "@/entities/lookups"
import { http } from "@/shared/api/http"
import { useApiMutation, useApiQuery, useListQuery } from "@/shared/api/query"
import { RESOURCE_PACKAGE, PACKAGE_INFO } from "@/shared/auth/entitlements"
import { ACTION_LABELS, ACTIONS, RESOURCES, RESOURCE_ACTIONS, RESOURCE_LABELS, type Permission } from "@/shared/auth/permissions"
import { inviteUserSchema, roleInputSchema, type Role, type User } from "@/shared/contracts/tenancy"
import { applyServerErrors, Form, FormInput, FormSelect, FormTextarea, useZodForm } from "@/shared/forms"
import { formatDateTime } from "@/shared/lib/format"
import { ListFooter } from "@/shared/ui/ListFooter"
import { StatusBadge } from "@/shared/ui/status"
import { useListState } from "@/shared/ui/useListState"

type RoleRow = Role & { userCount: number }
const KEY = ["settings", "access"]

/** Ayarlar → Kullanıcılar & roller: invite, role assignment, custom roles (RBAC). */
export function AccessSettings() {
  const { canDo, me } = useAccess()
  const list = useListState({ tab: "İç kullanıcılar", pageSize: 25 })
  const users = useListQuery<User>([...KEY, "users"], "/settings/users", list.params)
  const roles = useApiQuery<RoleRow[]>([...KEY, "roles"], "/settings/roles")
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<{ role?: RoleRow; cloneOf?: RoleRow } | null>(null)
  const updateUser = useApiMutation((v: { id: string; roleId?: string; status?: "Aktif" | "Pasif" }) => http.patch<User>(`/settings/users/${v.id}`, v), {
    invalidate: [KEY],
    success: "Kullanıcı yetkileri güncellendi.",
  })
  const deleteRole = useApiMutation((id: string) => http.delete(`/settings/roles/${id}`), { invalidate: [KEY], success: "Rol silindi." })
  const external = list.tab === "Dış kullanıcılar"
  const roleOptions = (roles.data ?? []).filter((r) => (r.scope === "customer") === external)

  return (
    <div className="flex flex-col gap-5">
      <Card
        title="Ekibiniz & erişim yetkileri"
        subtitle="Yalnızca ofis ekibi ve müşteri temsilcileri giriş yapar; şoförler kullanıcı değildir."
        action={
          canDo("users", "create") && (
            <Button variant="primary" leftIcon={<PlusIcon size={16} />} onClick={() => setInviting(true)}>
              Kullanıcı davet et
            </Button>
          )
        }
      >
        <div className="mt-3">
          <Tabs variant="panel" items={["İç kullanıcılar", "Dış kullanıcılar"]} value={list.tab} onChange={list.setTab} aria-label="Kullanıcı türü" />
        </div>
        <Toolbar start={<SearchInput value={list.q} onValueChange={list.setQ} placeholder="Ad, e-posta veya rol ara..." />} />
        <DataTable<User>
          aria-label="Kullanıcılar"
          data={users.data?.items ?? []}
          getRowId={(u) => u.id}
          minWidth={720}
          sort={list.tableSort}
          onSortChange={list.onTableSort}
          empty={<EmptyState title="Kullanıcı bulunamadı" />}
          footer={<ListFooter total={users.data?.total ?? 0} page={list.page} pageSize={list.pageSize} onPage={list.setPage} noun="kullanıcı" />}
          columns={[
            { key: "name", header: "Kullanıcı", sortValue: (u) => u.name, cell: (u) => <TableCellEntity leading={<Avatar name={u.name} size="sm" />} title={u.name} subtitle={u.email} /> },
            {
              key: "role",
              header: "Rol",
              sortValue: (u) => u.roleName,
              cell: (u) =>
                canDo("users", "update") && u.id !== me?.user.id ? (
                  <div className="w-44" onClick={(e) => e.stopPropagation()}>
                    <Select
                      variant="compact"
                      aria-label={`${u.name} rolü`}
                      value={u.roleId}
                      onChange={(e) => updateUser.mutate({ id: u.id, roleId: e.target.value })}
                      options={roleOptions.map((r) => ({ value: r.id, label: r.name }))}
                    />
                  </div>
                ) : (
                  <Badge tone="blue">{u.roleName}</Badge>
                ),
            },
            { key: "scope", header: "Kapsam", hideOnMobile: true, cell: (u) => (u.kind === "external" ? `${u.customerName} · yalnızca kendi kayıtları` : u.title) },
            { key: "last", header: "Son giriş", hideOnMobile: true, cell: (u) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—") },
            { key: "status", header: "Durum", sortValue: (u) => u.status, cell: (u) => <StatusBadge status={u.status} tone={u.status === "Pasif" ? "red" : undefined} /> },
            {
              key: "actions",
              header: "",
              cell: (u) =>
                canDo("users", "update") &&
                u.id !== me?.user.id && (
                  <Button size="sm" variant={u.status === "Pasif" ? "secondary" : "danger"} onClick={() => updateUser.mutate({ id: u.id, status: u.status === "Pasif" ? "Aktif" : "Pasif" })}>
                    {u.status === "Pasif" ? "Etkinleştir" : "Pasifleştir"}
                  </Button>
                ),
            },
          ]}
        />
      </Card>

      <Card title="Roller & yetkiler" subtitle="Her rolün erişebileceği modüller ve yapabileceği işlemler. Sistem rolleri kopyalanarak özelleştirilir.">
        <div className="mt-4">
          <DataTable<RoleRow>
            aria-label="Roller"
            data={roles.data ?? []}
            getRowId={(r) => r.id}
            onRowClick={(r) => setEditing({ role: r })}
            minWidth={640}
            columns={[
              { key: "name", header: "Rol", cell: (r) => <TableCellEntity title={r.name} subtitle={r.description} /> },
              { key: "type", header: "Tür", cell: (r) => <Badge tone={r.system ? "blue" : "green"}>{r.system ? "Sistem rolü" : "Özel rol"}</Badge> },
              { key: "scope", header: "Veri kapsamı", hideOnMobile: true, cell: (r) => (r.scope === "customer" ? "İlişkili müşteri" : "Tüm şirket") },
              { key: "perms", header: "Yetki", cell: (r) => `${r.permissions.length} izin` },
              { key: "users", header: "Kullanıcı", cell: (r) => r.userCount },
              {
                key: "actions",
                header: "",
                cell: (r) =>
                  canDo("roles", "manage") && (
                    <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" leftIcon={<CopyIcon size={13} />} onClick={() => setEditing({ cloneOf: r })}>
                        Kopyala
                      </Button>
                      {!r.system && (
                        <Button size="sm" variant="danger" aria-label="Rolü sil" leftIcon={<Trash2Icon size={13} />} onClick={() => deleteRole.mutate(r.id)}>
                          Sil
                        </Button>
                      )}
                    </span>
                  ),
              },
            ]}
          />
        </div>
      </Card>

      {inviting && <InviteModal roles={roles.data ?? []} onClose={() => setInviting(false)} />}
      {editing && <RoleEditor role={editing.role} cloneOf={editing.cloneOf} onClose={() => setEditing(null)} />}
    </div>
  )
}

function InviteModal({ roles, onClose }: { roles: RoleRow[]; onClose: () => void }) {
  const customers = useCustomerOptions()
  const form = useZodForm(inviteUserSchema, { defaultValues: { email: "", name: "", roleId: roles.find((r) => r.key === "operations")?.id ?? "", customerId: "" } })
  const roleId = useWatch({ control: form.control, name: "roleId" })
  const external = roles.find((r) => r.id === roleId)?.scope === "customer"
  const invite = useApiMutation((v: unknown) => http.post<User>("/settings/users", v), {
    invalidate: [KEY],
    toastError: false,
    success: (u) => `${u.email} davet edildi. (Demo: gerçek e-posta gönderilmez; şifre demo1234.)`,
    onSuccess: onClose,
  })
  return (
    <Modal open onClose={onClose} title="Ekibinize kullanıcı davet edin" subtitle="Davet edilen kullanıcı rolündeki modüllere erişir.">
      <Form
        form={form}
        onSubmit={(v) =>
          invite.mutate(
            { ...v, customerId: external ? v.customerId : undefined },
            {
              onError: (e) => {
                if (!applyServerErrors(form as never, e)) form.setError("email", { message: (e as Error).message })
              },
            },
          )
        }
      >
        <ModalBody>
          <FormInput name="email" label="E-posta adresi" type="email" autoFocus required />
          <FormInput name="name" label="Ad soyad" optional />
          <FormGrid>
            <FormSelect name="roleId" label="Rol" options={roles.map((r) => ({ value: r.id, label: r.name }))} />
            {external && (
              <FormSelect name="customerId" label="Bağlı müşteri" placeholder="Müşteri seçin" options={(customers.data?.items ?? []).map((c) => ({ value: c.id, label: c.name }))} />
            )}
          </FormGrid>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary" loading={invite.isPending}>
            Davet oluştur
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  )
}

function RoleEditor({ role, cloneOf, onClose }: { role?: RoleRow; cloneOf?: RoleRow; onClose: () => void }) {
  const { canDo } = useAccess()
  const source = role ?? cloneOf
  const readOnly = !!role?.system || !canDo("roles", "manage")
  const form = useZodForm(roleInputSchema, {
    defaultValues: {
      name: role ? role.name : cloneOf ? `${cloneOf.name} (kopya)` : "Yeni rol",
      description: source?.description ?? "",
      permissions: source?.permissions ?? [],
    },
  })
  const perms = new Set(useWatch({ control: form.control, name: "permissions" }) as string[])
  const toggle = (p: Permission, on: boolean) => {
    const next = new Set(perms)
    if (on) next.add(p)
    else next.delete(p)
    form.setValue("permissions", [...next], { shouldValidate: true })
  }
  const save = useApiMutation((v: unknown) => (role && !role.system ? http.patch<Role>(`/settings/roles/${role.id}`, v) : http.post<Role>("/settings/roles", v)), {
    invalidate: [KEY],
    toastError: false,
    success: (r) => `“${r.name}” rolü kaydedildi.`,
    onSuccess: onClose,
  })
  const permError = form.formState.errors.permissions?.message as string | undefined

  return (
    <Modal open onClose={onClose} size="lg" title={readOnly ? role!.name : role ? "Rolü düzenle" : "Özel rol oluştur"} subtitle={readOnly ? "Sistem rolü · yalnızca görüntüleme (kopyalayarak özelleştirin)" : "Modül × işlem yetki matrisi"}>
      <Form form={form} onSubmit={(v) => save.mutate(v, { onError: (e) => applyServerErrors(form as never, e) })}>
        <ModalBody>
          {!readOnly && (
            <>
              <FormInput name="name" label="Rol adı" required />
              <FormTextarea name="description" label="Açıklama" rows={2} />
            </>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="text-2xs text-ink-subtle">
                  <th className="py-2 pr-3 font-medium">Modül</th>
                  {ACTIONS.map((a) => (
                    <th key={a} className="px-1 py-2 text-center font-medium">
                      {ACTION_LABELS[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RESOURCES.map((r) => {
                  const pkg = RESOURCE_PACKAGE[r]
                  return (
                    <tr key={r} className="border-t border-border-faint">
                      <td className="py-2 pr-3 text-ink-body">
                        <span className="flex items-center gap-1.5">
                          {RESOURCE_LABELS[r]}
                          {pkg && <LockIcon size={11} title={`${PACKAGE_INFO[pkg].name} paketi`} className="text-ink-faint" />}
                        </span>
                      </td>
                      {ACTIONS.map((a) => {
                        const p = `${r}:${a}` as Permission
                        const available = RESOURCE_ACTIONS[r].includes(a)
                        return (
                          <td key={a} className="px-1 py-2 text-center">
                            {available ? (
                              <Checkbox aria-label={`${RESOURCE_LABELS[r]} · ${ACTION_LABELS[a]}`} checked={perms.has(p)} disabled={readOnly} onChange={(e) => toggle(p, e.target.checked)} />
                            ) : (
                              <span className="text-ink-faint">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {permError && <p className="mt-2 text-2xs text-danger-text">{permError}</p>}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>{readOnly ? "Kapat" : "Vazgeç"}</Button>
          {!readOnly && (
            <Button type="submit" variant="primary" loading={save.isPending}>
              Rolü kaydet
            </Button>
          )}
        </ModalFooter>
      </Form>
    </Modal>
  )
}
