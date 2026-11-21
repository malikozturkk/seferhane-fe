"use client"

import { useParams } from "next/navigation"
import { Alert, Brand, Button, Card, CheckIcon, EmptyState, SkeletonGroup, UploadZone } from "@/design-system"
import { ApiClientError, errorMessage, http } from "@/shared/api/http"
import { useApiMutation, useApiQuery } from "@/shared/api/query"
import type { MagicLinkInfo } from "@/shared/contracts/management"
import { formatDate, money } from "@/shared/lib/format"

/** Girişsiz, süreli, tek kullanımlık bağlantı: belge yükleme veya teklif onayı (plan §6 #7). */
export function MagicLinkScreen() {
  const { token } = useParams<{ token: string }>()
  const key = ["link", token]
  const { data, error } = useApiQuery<MagicLinkInfo>(key, `/links/${token}`)
  const upload = useApiMutation((fileName: string) => http.post(`/links/${token}/upload`, { fileName }), { invalidate: [key], toastError: false })
  const approve = useApiMutation(() => http.post(`/links/${token}/approve`), { invalidate: [key], toastError: false })
  const done = upload.isSuccess || approve.isSuccess || data?.used
  const failure = upload.error ?? approve.error

  return (
    <main className="flex min-h-screen justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-[480px]">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        {error instanceof ApiClientError ? (
          <EmptyState title="Bağlantı geçersiz" description="Bu bağlantı bulunamadı. Gönderen firmadan yeni bağlantı isteyin." />
        ) : !data ? (
          <SkeletonGroup />
        ) : (
          <Card title={data.purpose === "document_upload" ? "Eksik evrak yükleme" : "Teklif onayı"} subtitle={`${data.tenantName} · son gün ${formatDate(data.expiresAt)}`} padding="md">
            <h2 className="text-xl font-semibold text-ink-heading">{data.target.title}</h2>
            <p className="mt-2 mb-5 text-xs text-ink-subtle">{data.target.subtitle}</p>
            {done ? (
              <Alert tone="success" icon={<CheckIcon size={20} />} title={data.purpose === "document_upload" ? "Belgeniz iletildi" : "Teklif onaylandı"}>
                {data.purpose === "document_upload" ? "Operasyon ekibi belgeyi kontrol edip dosyaya ekleyecek." : "Teşekkürler. Operasyon ekibi seferi planlayacak."} Bu bağlantı artık kullanılamaz.
              </Alert>
            ) : data.purpose === "document_upload" ? (
              <>
                {!!data.target.missingDocuments?.length && (
                  <p className="mb-4 text-xs text-ink-body">Eksik belgeler: {data.target.missingDocuments.join(", ")}</p>
                )}
                <UploadZone accept=".pdf,image/*" onFilesChange={([f]) => upload.mutate(f.name)} />
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <strong className="text-2xl font-medium text-sage-700">
                  {money(data.target.amount ?? 0)}
                  <small className="block text-3xs font-normal text-sage-subtle">/ sefer + KDV</small>
                </strong>
                <Button variant="primary" leftIcon={<CheckIcon size={15} />} loading={approve.isPending} onClick={() => approve.mutate()}>
                  Teklifi onayla
                </Button>
              </div>
            )}
            {failure && (
              <div className="mt-4">
                <Alert tone="error" title="İşlem tamamlanamadı">
                  {errorMessage(failure)}
                </Alert>
              </div>
            )}
          </Card>
        )}
      </div>
    </main>
  )
}
