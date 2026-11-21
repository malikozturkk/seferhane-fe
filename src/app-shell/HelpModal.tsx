"use client"

import { useRouter } from "next/navigation"
import { Alert, ArrowRightIcon, BrandSymbol, CircleHelpIcon, Modal, ModalBody } from "@/design-system"
import { MODULES } from "@/modules/registry"

const LINKS: Array<[string, string]> = [
  ["/planning", "Sefer planlama & uygunluk kontrolü"],
  ["/operations", "Operasyon dosyası · WhatsApp'tan gelen POD & evrak"],
  ["/people", "Çalışanlar & İK · İşe giriş / çıkış, araç zimmeti"],
  ["/portal-preview", "Müşteri portalı · Evrak, teklif & şikâyet"],
  ["/settings", "Kullanıcılar, roller & paket"],
]

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Seferhane’ye hoş geldiniz"
      subtitle="Ürün planına dayalı etkileşimli uygulama"
    >
      <ModalBody>
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-[18px] text-brand-symbol">
            <BrandSymbol size={56} />
          </span>
          <h2 className="text-3xl leading-[1.45] font-semibold tracking-heading text-sage-800">
            Her sefer planlı.
            <br />
            Her detay yerinde.
          </h2>
          <p className="mt-[15px] text-xs leading-relaxed text-sage-muted">
            {MODULES.length} modül, panel ve müşteri portalı deneyimi ve ortak bir tasarım sistemi. Şoförler uygulama
            kullanmaz; bilgileri WhatsApp&apos;tan iletir.
          </p>
        </div>
        <Alert tone="info" icon={<CircleHelpIcon size={22} />}>
          Veriler örnektir ve sunucu yeniden başlatılana kadar saklanır. Gerçek e-posta, dosya depolama veya muhasebe
          entegrasyonu bağlı değildir.
        </Alert>
        <h3 className="mt-6 mb-[15px] text-sm font-semibold-soft text-ink-heading">Keşfetmeye buradan başlayın</h3>
        {LINKS.map(([href, label]) => (
          <button
            key={href}
            type="button"
            className="flex w-full items-center justify-between border-b border-sage-200 py-[15px] text-left text-sm text-sage-600 hover:text-brand"
            onClick={() => {
              onClose()
              router.push(href)
            }}
          >
            {label}
            <ArrowRightIcon size={15} />
          </button>
        ))}
      </ModalBody>
    </Modal>
  )
}
