import { Badge, type BadgeTone } from "@/design-system"

/**
 * Status text → badge tone (Make `Badge` rule): red = expired/damage/late,
 * amber = waiting/remaining, blue = on the way/planned, green = everything else.
 */
export function statusTone(status: string): BadgeTone {
  if (/doldu|hasar|Yüksek|eksik|gecik|Gecikti|aşıldı|Reddedildi/i.test(status)) return "red"
  if (/bekli|kaldı|Yükleme|İncele|Bakım|İzin|Taslak|Eşik|İtiraz|Yenileme/i.test(status)) return "amber"
  if (/Yolda|Seferde|Planlandı|Devam|iletildi|Açık|Kısmi/i.test(status)) return "blue"
  return "green"
}

export function StatusBadge({ status, tone }: { status: string; tone?: BadgeTone }) {
  return <Badge tone={tone ?? statusTone(status)}>{status}</Badge>
}
