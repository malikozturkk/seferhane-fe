# Seferhane Design System

Kaynak: Figma Make — "Seferhane Lojistik Yönetim Platformu" (`src/index.css`,
`src/ui.tsx`, Dashboard/Operations/Planning/Workspace ekranları ve
Ayarlar → "Tasarım sistemi" kataloğu).

Geliştirme kuralları: kök dizindeki `design-system.md`.

```tsx
import { Button, Card, AreaChart, SearchIcon } from "@/design-system"
```

## Yapı

| Klasör | İçerik |
| --- | --- |
| `tokens/tokens.css` | Tüm token'lar — `@theme static` ile hem CSS değişkeni hem Tailwind utility (`bg-surface`, `text-ink-muted`, `shadow-popover`…) |
| `tokens/base.css` | Body, focus ring, selection, kbd, reduced-motion |
| `tokens/index.ts` | Grafikler/TS için token referansları (`chartColors`, `categoricalPalette`, `breakpoints`, `zIndex`) |
| `icons/svg` | Kaynak SVG'ler (Lucide, ISC) |
| `icons/generated` | **Otomatik üretilir** — elle düzenlemeyin |
| `components/*` | Her bileşen kendi `.tsx` + `.module.css` dosyasıyla |
| `charts/*` | Her grafik türü ayrı bileşen |

## İkonlar

1. SVG'yi `src/design-system/icons/svg/` klasörüne kebab-case adla ekleyin (`truck-loaded.svg`).
2. `npm run icons` çalıştırın → `TruckLoadedIcon` üretilir ve `index.ts`'e eklenir.

```tsx
<SearchIcon size={20} color="currentColor" strokeWidth={1.65} />
<BellIcon title="Bildirimler" />      // title verilirse role="img", yoksa aria-hidden
<TruckIcon absoluteStrokeWidth size={32} />
```

SVGR ayarları: `scripts/svgr/` (config, bileşen ve index şablonu).

## Referansta olmayan / türetilen parçalar

Bunlar istenen listede vardı ancak Make tasarımında birebir karşılığı yok;
mevcut token'lardan türetildi, tasarımcı onayı önerilir:

- `Button variant="danger"`, `Spinner`, `Radio`, `Accordion`, `Pagination` (numaralı), `Tooltip` (genel),
  `Drawer` (sağdan açılan; soldan olan mobil menü referansta var), `Alert tone="warning"`,
  form doğrulama hata mesajı/kenarlığı, hata toast'ının ikonu.
- Pie chart referansta yok, eklenmedi (`DonutChart` mevcut).
