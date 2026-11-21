import type { Resource } from "@/shared/auth/permissions"
import type { RecordKind } from "@/shared/contracts/resources"

/**
 * Presentation config per secondary record kind. Adding a new kind = one
 * entry here + one in `RECORD_KINDS` (contracts) — no new screen.
 */
export interface RecordKindConfig {
  resource: Resource
  createLabel: string
  titleLabel: string
  refLabel: string
  ownerLabel: string
  dateLabel: string
  amountLabel?: string
  /** Show the amount input in the create form (₺). */
  amountInput?: boolean
  /** Upload zone in the create form. */
  upload?: boolean
  /** Detail modal shows the audit checklist + root cause. */
  checklist?: boolean
  approveLabel?: string
}

export const RECORD_KIND_CONFIG: Record<RecordKind, RecordKindConfig> = {
  "quality.audit": { resource: "quality", createLabel: "Denetim oluştur", titleLabel: "Denetim adı", refLabel: "Referans", ownerLabel: "Sorumlu", dateLabel: "Tarih", amountLabel: "Hazırlık", upload: true, checklist: true, approveLabel: "Denetimi tamamla" },
  "quality.nonconformity": { resource: "quality", createLabel: "Uygunsuzluk kaydı", titleLabel: "Uygunsuzluk", refLabel: "İlişkili kayıt", ownerLabel: "Sorumlu", dateLabel: "Hedef tarih", amountLabel: "Risk", upload: true, checklist: true, approveLabel: "DÖF'ü kapat" },
  "quality.training": { resource: "quality", createLabel: "Eğitim planla", titleLabel: "Eğitim adı", refLabel: "Referans", ownerLabel: "Sorumlu", dateLabel: "Tarih", amountLabel: "Katılım", approveLabel: "Tamamlandı" },
  "quality.sop": { resource: "quality", createLabel: "Prosedür ekle", titleLabel: "Prosedür adı", refLabel: "Departman", ownerLabel: "Sorumlu", dateLabel: "Yayın tarihi", upload: true, approveLabel: "Yayınla" },
  "fleet.maintenance": { resource: "fleet", createLabel: "Bakım planla", titleLabel: "Bakım", refLabel: "Araç", ownerLabel: "Sorumlu", dateLabel: "Tarih / Kalan km", amountLabel: "Tahmini tutar", amountInput: true, approveLabel: "Bakım tamamlandı" },
  "fleet.service": { resource: "fleet", createLabel: "Arıza kaydı", titleLabel: "Arıza / servis", refLabel: "Araç", ownerLabel: "Sorumlu", dateLabel: "Tarih", amountLabel: "Tutar", amountInput: true, approveLabel: "Onarım tamamlandı" },
  "fleet.tyre": { resource: "fleet", createLabel: "Lastik kaydı", titleLabel: "Pozisyon / marka", refLabel: "Araç", ownerLabel: "Sorumlu", dateLabel: "Kullanım", amountLabel: "Değişim", approveLabel: "Değişim yapıldı" },
  "fleet.fuelFine": { resource: "fleet", createLabel: "Yakıt / ceza kaydı", titleLabel: "Kayıt", refLabel: "Araç", ownerLabel: "Şoför", dateLabel: "Tarih / Km", amountLabel: "Tutar", amountInput: true, upload: true, approveLabel: "Onayla" },
  "people.timesheet": { resource: "people", createLabel: "İzin / puantaj kaydı", titleLabel: "Çalışan", refLabel: "Şube", ownerLabel: "Onaylayan", dateLabel: "Detay", amountLabel: "Bakiye", approveLabel: "İzni onayla" },
  "people.advance": { resource: "people", createLabel: "Avans / masraf ekle", titleLabel: "Kayıt", refLabel: "Referans", ownerLabel: "Kaydeden", dateLabel: "Tarih", amountLabel: "Tutar", amountInput: true, upload: true, approveLabel: "Onayla" },
  "people.abroad": { resource: "people", createLabel: "Yurt dışı günü gir", titleLabel: "Şoför", refLabel: "Ülkeler", ownerLabel: "Sorumlu", dateLabel: "Kullanım", amountLabel: "Kalan" },
  "customers.note": { resource: "customers", createLabel: "Görüşme notu ekle", titleLabel: "Görüşme başlığı", refLabel: "Müşteri kodu", ownerLabel: "Görüşen", dateLabel: "Tarih", approveLabel: "Tamamlandı" },
  "invoices.erpExport": { resource: "invoices", createLabel: "Aktarım kaydı", titleLabel: "Aktarım", refLabel: "Referans", ownerLabel: "Aktaran", dateLabel: "Tarih", amountLabel: "Tutar", amountInput: true },
  "tasks.template": { resource: "tasks", createLabel: "Şablon oluştur", titleLabel: "Şablon adı", refLabel: "Alan", ownerLabel: "Sahibi", dateLabel: "Son kullanım" },
}

/** Tab label → record kind, per module. */
export const TAB_KIND: Record<string, RecordKind> = {
  Denetimler: "quality.audit",
  "Uygunsuzluk & DÖF": "quality.nonconformity",
  Eğitimler: "quality.training",
  "SOP kütüphanesi": "quality.sop",
  "Bakım takvimi": "fleet.maintenance",
  "Servis & arıza": "fleet.service",
  Lastikler: "fleet.tyre",
  "Yakıt & cezalar": "fleet.fuelFine",
  "Puantaj & izin": "people.timesheet",
  "Avans & masraf": "people.advance",
  "Yurt dışı günleri": "people.abroad",
  "Görüşme notları": "customers.note",
  "ERP aktarım geçmişi": "invoices.erpExport",
  "İş akışı şablonları": "tasks.template",
}
