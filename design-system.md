# Seferhane Design System — Geliştirici & AI Kılavuzu

> Bu dosya, projede UI geliştiren herkes (özellikle Claude) için **bağlayıcı kurallardır**.
> Yeni bir ekran, bileşen veya stil yazmadan önce baştan sona okuyun.

- **Kaynak tasarım:** Figma Make — "Seferhane Lojistik Yönetim Platformu" (yönetim paneli).
- **Kod konumu:** `src/design-system/`
- **Stack:** Next.js 16 (App Router, Turbopack, `cacheComponents`), React 19, TypeScript strict, Tailwind CSS 4, CSS Modules.

---

## 1. Altın kurallar

1. **Önce design system'i kullan.** Bir UI parçası yazmadan önce `src/design-system/index.ts` export listesine bak. Varsa onu kullan; ham `<button>`, `<input>`, `<table>` vb. ile yeniden yazma.
2. **Sabit değer yazma.** Renk, font boyutu, radius, gölge, z-index için **her zaman token** kullan (`var(--color-…)` veya Tailwind utility'si). Hex kodu, `px` font boyutu, `box-shadow` literal'i yeni kodda yasaktır — token yoksa önce token ekle (bkz. §3.5).
3. **İkonlar sadece `@/design-system` üzerinden.** `lucide-react` veya başka ikon paketi kurma/import etme. Yeni ikon gerekiyorsa SVG ekle + `npm run icons` (bkz. §5).
4. **Tasarımı yorumlama, referansa sadık kal.** Referansta olmayan bir görsel dil uydurma. Emin değilsen mevcut bileşenin varyantını kullan ve belirsizliği kullanıcıya bildir.
5. **Varyasyon = prop.** Aynı işlevi gören farklı görünümler için yeni bileşen değil, mevcut bileşene `variant` / `size` / `tone` prop'u ekle.
6. **Yeni dependency ekleme.** UI, grafik, ikon, className yardımcı kütüphanesi (clsx, radix, recharts, framer-motion vb.) eklenmez. İhtiyaç varsa önce kullanıcıya sor.
7. **Erişilebilirlik zorunlu.** Icon-only butonlarda `aria-label`, grafiklerde `aria-label`, form kontrollerinde `FormField` ile label bağlantısı (bkz. §7).
8. **Design system bileşenlerinde iş mantığı olmaz.** Veri çekme, domain kuralı (ör. "durum metnine göre badge rengi seç"), API çağrısı bileşenin dışında, sayfa/feature katmanında yapılır.
9. **Generated dosyaları elle düzenleme.** `src/design-system/icons/generated/**` otomatik üretilir.
10. **İşi bitirmeden doğrula:** `npx tsc --noEmit`, `npm run lint`, `npm run build` (bkz. §10).

---

## 2. Klasör yapısı

```
src/design-system/
├── index.ts                 # Tek giriş noktası (barrel) — her şey buradan export edilir
├── README.md
├── tokens/
│   ├── tokens.css           # TÜM token'lar (@theme static) + :root layout/z-index/spacing
│   ├── base.css             # body, focus ring, selection, kbd, reduced-motion
│   └── index.ts             # TS referansları: chartColors, categoricalPalette, statusPalette, breakpoints, zIndex, spacing
├── utils/
│   ├── cn.ts                # className birleştirici (clsx yerine)
│   └── hooks.ts             # useControllableState, useDismiss, useFocusTrap, useIsClient, useStableId
├── icons/
│   ├── svg/                 # Kaynak SVG'ler (Lucide, ISC lisansı: LUCIDE_LICENSE)
│   ├── generated/           # SVGR çıktısı — ELLE DÜZENLEME
│   ├── types.ts             # IconProps, IconComponent
│   └── index.ts
├── components/<Name>/
│   ├── <Name>.tsx           # Bileşen(ler)
│   └── <Name>.module.css    # Bileşene özel stil
└── charts/
    ├── internal/TrendChart.tsx   # Area/Line ortak motoru (dışarı export edilmez)
    ├── AreaChart.tsx, LineChart.tsx, BarChart.tsx, StackedBarChart.tsx,
    ├── HorizontalBarChart.tsx, DonutChart.tsx, BreakdownChart.tsx, ChartLegend.tsx
    ├── Charts.module.css
    └── index.ts

scripts/svgr/                # SVGR config + bileşen/index şablonları
src/app/globals.css          # tailwindcss + tokens.css + base.css importları
src/app/layout.tsx           # Inter (--font-inter) + DM Sans (--font-dm-sans) — next/font
```

### Import kuralı

```tsx
// ✅ Tercih edilen
import { Button, Card, DataTable, SearchIcon, chartColors } from "@/design-system"

// ✅ Gerekirse doğrudan dosyadan (tree-shaking / döngüsel import durumunda)
import { Button } from "@/design-system/components/Button/Button"

// ❌ Yasak
import { Search } from "lucide-react"
import styles from "@/design-system/components/Button/Button.module.css" // başka bileşenin CSS'ini kullanma
```

Design system **içindeki** dosyalar birbirini barrel'dan değil **göreli yoldan** import eder (`../Button/Button`, `../../icons`) — döngüsel import'u önlemek için.

---

## 3. Token sistemi

Tüm token'lar `src/design-system/tokens/tokens.css` içindedir. `@theme static` sayesinde her token:
- `:root` üzerinde **CSS değişkeni** olarak (`var(--color-primary)`), ve
- **Tailwind utility'si** olarak (`bg-primary`, `text-ink-muted`, `rounded-xl`, `shadow-popover`, `text-sm`) kullanılabilir.

### 3.1 Renkler

| Grup | Token'lar | Kullanım |
|---|---|---|
| Marka | `--color-brand` (#168368 "Orman"), `--color-brand-mint` ("Nane"), `--color-brand-symbol`, `--color-brand-wordmark` | Logo, link hover, checkbox accent |
| Ana aksiyon | `--color-primary`, `--color-primary-hover`, `--color-primary-fg` | Birincil buton |
| Odak / seçim | `--color-focus-ring`, `--color-focus-ring-input`, `--color-selection(-fg)`, `--color-live(-off)` | Focus outline, canlı nokta |
| Metin (ink) | `--color-ink` (gövde), `-ink-strong` (sayfa başlığı), `-ink-heading` (kart başlığı), `-ink-value` (KPI), `-ink-secondary`, `-ink-nav`, `-ink-body` (tablo), `-ink-emphasis`, `-ink-label` (form), `-ink-muted`, `-ink-subtle`, `-ink-faint`, `-ink-placeholder`, `-ink-icon` | Koyudan açığa metin hiyerarşisi |
| Yüzey | `--color-canvas` (uygulama zemini), `-surface` (beyaz), `-surface-subtle`, `-surface-sunken`, `-surface-muted`, `-surface-hover`, `-surface-row-hover`, `-surface-nav-hover`, `-surface-nav-active`, `--color-overlay` | Arka planlar |
| Kenarlık | `--color-border`, `-border-subtle`, `-border-faint`, `-border-strong`, `-border-input`, `-border-hover`, `-border-emphasis` | 1px çizgiler |
| Sage | `--color-sage-25 … -800`, `-sage-muted`, `-sage-subtle` | Notice, toast, empty, timeline, modal, toggle, progress gibi **geri bildirim yüzeyleri** |
| Semantik | `success`, `info`, `warning`, `danger` + `-soft`, `-text`, `-strong`, `-surface`, `-border`, `-muted`… | Durumlar (badge, alert, validation) |
| Dekoratif ton | `--color-tone-{orange,purple,blue,green,sand}` + `-soft` | IconTile, avatar |
| Grafik | `--color-chart-primary/area/point/comparison/grid/crosshair/axis/axis-active/track/bar-track`, `--color-chart-1 … -9` (kategorik), `--color-status-{transit,loading,planned,delivered,docs}` | Sadece veri görselleştirme |

**Renk anlam kuralları**
- Yeşil (`primary`/`brand`) = ana aksiyon ve marka. Dekorasyon için kullanma.
- Semantik renkler **sadece durum** bildirir: `green` tamamlandı/geçerli · `blue` yolda/planlandı · `amber` bekliyor/yaklaşıyor · `red` süresi doldu/hata.
- Grafik renkleri UI'da (buton, kart) kullanılmaz; UI renkleri grafikte kullanılmaz.

### 3.2 Tipografi

- `--font-sans` = Inter (arayüz), `--font-brand` = DM Sans (yalnızca logo/wordmark ve monogram).
- Tasarım **kompakt**tır; gövde metni 12px'tir. Font ölçeği (`--text-*`, Tailwind `text-*`):

| Token | px | Tipik kullanım |
|---|---|---|
| `micro` | 7 | Çok küçük etiket, pill |
| `3xs` | 8 | Eyebrow, yardımcı metin, tooltip başlığı |
| `2xs` | 9 | Badge, alt satır, tablo başlığı (mobil) |
| `xs` | 10 | Buton, tab, label, açıklama |
| `sm` | 11 | Input, tablo hücresi, liste başlığı |
| `base` | 12 | Gövde, sayfa açıklaması |
| `md` | 13 | Kart/section başlığı |
| `lg` | 14 | Kart başlığı (≥1500px) |
| `xl` | 18 | Modal başlığı, grafik özeti |
| `2xl` | 22 | Büyük vurgu |
| `3xl` | 27 | Sayfa başlığı (h1) |
| `4xl` | 28 | KPI değeri |
| `display` | 34 | Donut merkez değeri |

- Ağırlıklar (`--font-weight-*`): `regular 400`, `book 450`, `medium 500`, `semibold-soft 550`, `semibold 600`, `bold-soft 650`, `bold 700`. Inter variable font olduğu için ara ağırlıklar gerçek render edilir.
- Satır yüksekliği: `tight 1.2`, `snug 1.35`, `normal 1.7`, `relaxed 1.9`.
- Harf aralığı: `display -1.25px`, `metric -1.1px`, `heading -0.9px`, `title -0.4px`, `tight -0.2px`, `label 1.15px`, `eyebrow 1.5px`.

### 3.3 Spacing, radius, gölge, z-index

- **Spacing:** 4px taban → `--space-1…8` = 4/8/12/16/20/24/32. Tailwind `--spacing` de 4px (`p-4` = 16px). Referans tasarımda bileşen içi bazı özel değerler (17, 21, 23px) vardır; bunlar **ilgili bileşenin module CSS'inde** kalır, yeni kodda 4px ölçeğini kullan.
- **Radius:** `xs 3` (pill, kbd) · `sm 4` (badge, chip) · `md 5` (buton, input) · `lg 6` (alert, icon tile) · `xl 7` (aksiyon kartı, menü) · `2xl 8` (kart, panel) · `3xl 10` · `4xl 12` (modal).
- **Gölge:** `xs` (buton), `sm` (kart), `primary` (birincil buton), `card-hover`, `segment`, `tooltip`, `dropdown`, `popover`, `toast`, `modal`. Gölgeler çok hafiftir; daha koyu gölge ekleme.
- **Z-index** (`--z-*` / TS `zIndex`): `dropdown 20` < `topbar 25` < `sidebar 40` < `popover 70` < `drawer-overlay 80` < `drawer 90` < `modal 100` < `toast 150` < `tooltip 160`. Yeni katman eklerken bu ölçeğe yerleştir, rastgele `z-index: 9999` yazma.
- **Layout değişkenleri:** `--layout-sidebar-width` (232 / 212 ≤1150 / 244 mobil), `--layout-topbar-height` (65 / 58 mobil), `--layout-content-max` (1760), `--layout-content-padding` (kırılıma göre değişir).
- **Hareket:** `--duration-fast .12s`, `-base .16s`, `-slow .2s`; animasyonlar `appear`, `shimmer`, `spin`. `prefers-reduced-motion` global olarak animasyonu kapatır.

### 3.4 Kırılımlar (breakpoints)

Referans tasarım **max-width** kırılımları kullanır:

| Ad | Koşul | Davranış |
|---|---|---|
| wide | `min-width: 1500px` | Daha büyük KPI, kart başlığı, padding |
| laptop | `max-width: 1150px` | Sidebar 212px, sıkı boşluklar |
| tablet | `max-width: 950px` | KPI 2 sütun, grafik/detay grid tek sütun |
| mobile | `max-width: 700px` | Sidebar off-canvas drawer, sticky topbar, tablolar yatay scroll |

- Module CSS'te bu değerleri literal yaz (`@media (max-width: 700px)`); CSS değişkeni media query'de çalışmaz.
- Tailwind'de: `sm` = 701px, `md` = 951px, `lg` = 1151px, `xl` = 1500px (min-width). Örn. `max-sm:hidden` = ≤700px'te gizle.
- TS'te: `breakpoints` (`mobile 700`, `tablet 950`, `laptop 1150`, `wide 1500`).

### 3.5 Yeni token ekleme

1. Değer tasarımda gerçekten tekrar ediyor mu / anlamlı mı? Tek seferlik ise bileşen CSS'inde kalsın.
2. Uygun gruba `tokens.css` içinde ekle (`--color-…`, `--text-…`, `--radius-…`, `--shadow-…`). Tailwind utility'si otomatik oluşur.
3. TS tarafında gerekiyorsa `tokens/index.ts`'e `var(--…)` referansı olarak ekle (hex kopyalama).
4. Aynı değeri başka bir isimle ikinci kez tanımlama.

---

## 4. Stil yazma kuralları

- **Design system bileşenleri:** CSS Modules (`<Name>.module.css`) + token değişkenleri. Tailwind utility'si kullanma (bileşenler framework'ten bağımsız ve okunabilir kalsın).
- **Sayfa / feature kodu:** Önce design system bileşeni; layout için `Grid`, `Stack`, `Container`. Kalan küçük düzen ihtiyaçları için **Tailwind utility'leri token isimleriyle** (`gap-4`, `text-ink-muted`, `bg-surface`). Inline `style` sadece dinamik değerler (genişlik yüzdesi, veri rengi) için.
- className birleştirme: `cn()` (`@/design-system`).
- Her bileşen `className` prop'unu kabul eder ve kök elemana ekler; dışarıdan stil override'ı sadece **yerleşim** (margin, width, grid alanı) içindir — rengi/fontu değiştirmek için varyant ekle.
- Başka bir bileşenin module CSS'ini import etme. Ortak stil gerekiyorsa ortak bileşen çıkar.
- `!important` sadece referans tasarımdan gelen print/mobile override'larında var; yeni kodda kullanma.
- **Turbopack notu:** `next.config.ts` içindeki Tailwind loader kuralı `.module.css` dosyalarını hariç tutar. Bu koşulu kaldırma — kaldırılırsa tüm CSS Modules stilsiz kalır.
- Global stil sadece `tokens/base.css`'e; sayfaya özel global CSS ekleme.

---

## 5. İkon sistemi

- Kaynak: `src/design-system/icons/svg/*.svg` (Lucide, 24×24, stroke tabanlı).
- Üretim: **`npm run icons`** → `@svgr/cli` + `scripts/svgr/svgr.config.cjs`. Çıktı `icons/generated/`, export'lar `icons/generated/index.ts`.
- İsimlendirme: `truck-loaded.svg` → `TruckLoadedIcon`. Her zaman `…Icon` son ekiyle import edilir.

```tsx
import { SearchIcon, BellIcon } from "@/design-system"

<SearchIcon />                                  // 24px, currentColor, stroke 2
<SearchIcon size={16} />                        // boyut
<BellIcon size={19} color="var(--color-brand)" />
<SearchIcon strokeWidth={1.65} />               // sidebar nav ikonları 1.65 kullanır
<SearchIcon absoluteStrokeWidth size={32} />    // boyuttan bağımsız sabit çizgi kalınlığı
<BellIcon title="Bildirimler" />                // title varsa role="img", yoksa aria-hidden
```

**Yeni ikon ekleme**
1. SVG'yi kebab-case adla `icons/svg/` klasörüne koy (Lucide ise `lucide-static` paketindeki dosyayı kullan; stroke = `currentColor`).
2. `npm run icons` çalıştır.
3. Generated dosyaları ve SVG'yi birlikte commit et.

**Tasarımdaki ikon boyutları:** nav 17 · topbar 18–21 · buton içi 14–16 · tablo 12–15 · KPI 18 · attention/notification 18–20 · modal kapat 20 · empty state 24.

---

## 6. Bileşen kataloğu

> Tüm bileşenler `@/design-system`'den import edilir. Tam prop listesi için ilgili `.tsx` dosyasındaki `…Props` arayüzüne bakın.
> "Client" = `"use client"` içerir (state/handler). Diğerleri Server Component içinde doğrudan kullanılabilir.

### 6.1 Form

| Bileşen | Önemli prop'lar | Not |
|---|---|---|
| `FormField` | `label`, `hint`, `error`, `required`, `optional`, `flush` | Client. İçindeki kontrolün `id`, `aria-describedby`, `aria-invalid` değerlerini **otomatik** bağlar. Her form kontrolü bunun içinde olmalı. |
| `FormGrid` | — | 2 sütunlu alan ızgarası |
| `Input` | `size: "md" \| "sm"`, `invalid` | `sm` = satır içi form |
| `Textarea` | `rows`, `invalid` | |
| `Select` | `options`, `variant: "field" \| "compact"`, `placeholder` | **Native select** (tasarım böyle). `compact` = kart başlığındaki dönem seçici |
| `Checkbox` | `label`, `description`, `variant: "default" \| "task"`, `indeterminate` | `task` = görev listesi görünümü |
| `Radio` / `RadioGroup` | `options`, `value`/`defaultValue`, `onChange`, `label` (zorunlu), `direction` | *Türetilmiş* |
| `Switch` | `checked`/`defaultChecked`, `onCheckedChange`, `label`, `description` | `label` verilirse ayar satırı düzeni |
| `DatePicker` | `mode: "date" \| "time" \| "datetime-local" \| "month"` | Native picker; değerler ISO string |
| `SearchInput` | `value`, `onValueChange`, `variant: "inline" \| "command"` | `inline` = toolbar araması (temizle butonlu), `command` = global arama |
| `SearchTrigger` | `label`, `shortcut` | Sidebar "Hızlı erişim ⌘K" |
| `UploadZone` | `onFilesChange`, `accept`, `multiple`, `title`, `description` | Sürükle-bırak destekli |

```tsx
<FormGrid>
  <FormField label="Yükleme şehri" required>
    <Input value={from} onChange={(e) => setFrom(e.target.value)} />
  </FormField>
  <FormField label="Teslimat tarihi" error={errors.date}>
    <DatePicker value={date} onChange={(e) => setDate(e.target.value)} />
  </FormField>
</FormGrid>
```

### 6.2 Etkileşimli

| Bileşen | Önemli prop'lar | Not |
|---|---|---|
| `Button` | `variant: primary \| secondary \| dashed \| ghost \| link \| danger`, `size: sm \| md \| lg`, `loading`, `fullWidth`, `leftIcon`, `rightIcon` | Varsayılan `secondary`. Sayfa başına genelde **tek** `primary`. `danger` türetilmiş. |
| `IconButton` | `aria-label` (zorunlu), `icon`, `variant: ghost \| outline`, `size`, `indicator` | `indicator` = okunmamış noktası |
| `Modal` + `ModalBody` + `ModalFooter` | `open`, `onClose`, `title`, `subtitle`, `size: md \| lg` | Client. Portal, focus trap, Escape, scroll lock. Footer'da sağa hizalı: `[İkincil] [Birincil]` |
| `Drawer` | `open`, `onClose`, `side`, `width`, `title` | Client. *Sağ taraf türetilmiş* |
| `DropdownMenu` | `trigger(props)`, `items[{key,label,icon,onSelect,selected,disabled}]`, `title`, `subtitle`, `footer`, `align` | Client. Trigger'a gelen `props`'u butona yay. Ok tuşları/Home/End/Escape |
| `Popover` + `NotificationItem` | `trigger(props)`, `title`, `count`, `headerAction`, `width` | Client. Bildirim paneli |
| `Tooltip` | `content`, `title`, `side`, tek odaklanabilir `children` | Client. *Türetilmiş* (grafik tooltip stili) |
| `Tabs` + `TabPanel` | `items`, `value`/`onChange`, `variant: page \| panel`, `id` | Client. `panel` = kart içinde. Ok tuşlarıyla gezilir |
| `SegmentedControl` | `options[{value,label,hint,"aria-label"}]`, `variant: text \| icon`, `aria-label` | `icon` = liste/kart görünüm değiştirici |
| `Accordion` | `items`, `type: single \| multiple` | Client. *Türetilmiş* |
| `Pagination` | `page`, `pageCount`, `onPageChange`, `variant: compact \| full` | *Numaralı varyant türetilmiş* |
| `Stepper` | `steps`, `current`, `variant: progress \| compact`, `onStepClick` | `progress` = sefer yolculuğu, `compact` = çok adımlı form |

```tsx
<DropdownMenu
  title={user.name}
  subtitle={user.email}
  trigger={(p) => (
    <button type="button" {...p} aria-label="Kullanıcı menüsü"><Avatar name={user.name} size="sm" /></button>
  )}
  items={[{ key: "settings", label: "Hesap & ayarlar", icon: <Settings2Icon size={15} />, onSelect: openSettings }]}
/>
```

### 6.3 Geri bildirim

| Bileşen | Önemli prop'lar | Not |
|---|---|---|
| `ToastProvider` + `useToast()` | `mode: "replace" \| "stack"`; `notify(message, { tone, duration })` | Uygulama kökünde **bir kez** sar. Varsayılan 5 sn, tek toast (referans davranışı). Hata için `tone: "error"` |
| `Alert` | `tone: success \| info \| warning \| error`, `title`, `icon`, `action` | Sayfa içi bilgi/uyarı (`.notice`). `warning` türetilmiş |
| `Badge` | `tone: green \| blue \| amber \| red`, `dot`, `size` | Durum etiketi. **Tonu çağıran taraf belirler** |
| `CountBadge` | `variant: neutral \| subtle \| alert` | Sayaç |
| `Pill` | `variant: phase \| new` | "Faz 2", "YENİ" |
| `StatusIndicator` | `status: live \| off \| warning \| danger`, `size`, `label` | Canlı nokta |
| `Spinner` | `size`, `tone`, `label` | *Türetilmiş*. Buton içinde `Button loading` kullan |
| `Skeleton` / `SkeletonGroup` | `width`, `height`, `shape` / `lines` | Yükleme yer tutucu (Suspense fallback) |
| `ProgressBar` | `value`, `max`, `label`, `valueLabel`, `size: sm \| md \| lg`, `color`, `variant: plain \| boxed` | |
| `EmptyState` | `title`, `description`, `icon`, `action`, `size` | Varsayılan metin "Aradığınız kayıt bulunamadı" |

**Durum üçlüsü kuralı:** Veri gösteren her alan **loading** (`SkeletonGroup`), **empty** (`EmptyState`) ve **error** (`Alert tone="error"`) durumlarını ele almalıdır. İşlem sonuçları `useToast().notify` ile bildirilir.

### 6.4 Veri gösterimi & kartlar

| Bileşen | Önemli prop'lar | Not |
|---|---|---|
| `Card` | `title`, `subtitle`, `action`, `padding: none \| md`, `headerSpacing`, `as` | Tüm paneller. `padding="none"` iken içerik kendi boşluğunu verir (tablo, liste) |
| `MetricCard` + `MetricGrid` | `label`, `value`, `change`, `foot`, `icon`, `tone: default \| warning`, `onClick` | KPI kartları (4 → 2 sütun) |
| `StatGroup` | `items[{label,value,suffix,caption,tone}]` | Bölünmüş mini istatistik şeridi |
| `ActionCard` | `icon`, `tone`, `title`, `description`, `linkLabel`, `indicator`, `onClick` | "Dikkat gerektirenler" kartları |
| `IconTile` | `icon`, `tone`, `size`, `shape: rounded \| circle \| file` | İkon kutusu |
| `Avatar` / `CompanyAvatar` | `name`, `size` / `name`, `initials`, `colorIndex` | Baş harfler otomatik |
| `DataTable` | `data`, `columns[{key,header,cell,sortValue,align,width,hideOnMobile}]`, `getRowId`, `onRowClick`, `selectable`, `selectionActions`, `empty`, `footer`, `minWidth`, `aria-label` | Client. Tüm liste ekranları bununla yapılır |
| `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell` | — | Özel tablo gerektiğinde primitive'ler |
| `TableCellEntity`, `CellSub` | — | Hücre içi avatar+başlık+alt satır |
| `ListItem` | `leading`, `title`, `description`, `trailing`, `variant: document \| finance \| simple` | Kart içi satırlar |
| `DescriptionList` | `items[{label,value,tone}]`, `layout: rows \| grid` | Anahtar/değer bilgileri |
| `Timeline` | `items[{time,title,description}]` | Aktivite akışı |

```tsx
<Card>
  <Tabs variant="panel" items={tabs} value={tab} onChange={setTab} />
  <Toolbar start={<SearchInput value={q} onValueChange={setQ} />} end={<Button size="sm">Dışa aktar</Button>} />
  <DataTable
    aria-label="Seferler"
    data={rows}
    getRowId={(r) => r.id}
    onRowClick={openTrip}
    selectable
    minWidth={650}
    columns={[
      { key: "id", header: "Sefer", sortValue: (r) => r.id, cell: (r) => <strong>{r.id}</strong> },
      { key: "status", header: "Durum", cell: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    ]}
    footer={<><span>{rows.length} kayıt</span><Pagination page={page} pageCount={pages} onPageChange={setPage} /></>}
  />
</Card>
```

### 6.5 Layout & navigasyon

| Bileşen | Önemli prop'lar | Not |
|---|---|---|
| `AppShell` | `sidebar`, `header`, `children` | Uygulama iskeleti (sidebar genişliği kadar sol boşluk) |
| `Container` | `as`, `size: page \| narrow \| none` | Ana içerik (max 1760px, kırılıma göre padding) |
| `Grid` | `layout: charts \| detail \| cols-2 \| cols-3` | `charts` = 1.95fr/1fr, `detail` = içerik + 290px aside |
| `Stack` | `gap` | Dikey yığın |
| `Divider` | `orientation`, `spacing` | |
| `Sidebar` + `NavGroup` + `NavItem` + `WorkspaceSwitcher` + `SidebarProfile` | `brand`, `header`, `footer`, `mobileOpen`, `onMobileClose` / `label` / `icon`, `label`, `active`, `trailing`, `external`, `href` | Client. ≤700px'te off-canvas |
| `Header` + `HeaderDivider` | `start`, `end`, `onMenuClick` | Topbar; `onMenuClick` mobil hamburger'i gösterir |
| `Breadcrumb` | `items[{label,href,onClick,icon}]` | Son öğe = mevcut sayfa |
| `PageHeader` | `eyebrow`, `title`, `description`, `titleAddon`, `actions`, `back` | Her sayfanın başında **bir kez** |
| `SectionHeader` | `title`, `count`, `action`, `as` | Sayfa içi bölüm başlığı |
| `Eyebrow` | — | Büyük harfli üst etiket |
| `Toolbar` + `FilterChip` | `start`, `end` / `onRemove` | Tablo üstü araç çubuğu |
| `Brand` / `BrandSymbol` | `size`, `inverse`, `label` | Logo — başka yerde yeniden çizme |

**Standart sayfa iskeleti**

```tsx
<AppShell sidebar={<AppSidebar />} header={<Header start={<Breadcrumb items={crumbs} />} end={actions} onMenuClick={openMenu} />}>
  <Container>
    <PageHeader eyebrow="OPERASYON" title="Operasyon dosyaları" description="…" actions={<Button variant="primary" leftIcon={<PlusIcon size={16} />}>Yeni sefer</Button>} />
    <MetricGrid>…</MetricGrid>
    <Grid layout="charts">…</Grid>
    <SectionHeader title="Dikkat gerektirenler" count={3} action={<Button variant="link">Tümünü görüntüle</Button>} />
    …
  </Container>
</AppShell>
```

---

## 7. Grafikler

Tüm grafikler kütüphanesiz, SVG/CSS ile yazılmıştır; veri, boyut ve renkler prop ile gelir. **Yeni grafik kütüphanesi ekleme.**

| Bileşen | Veri şekli | Referans |
|---|---|---|
| `AreaChart` | `data: [{ label, tooltipLabel?, [key]: number }]`, `series: [{ key, label, color?, variant? }]` | Dashboard gelir/gider. İlk seri alan, diğerleri kesikli çizgi |
| `LineChart` | AreaChart ile aynı | Dolgusuz çizgi; `variant: "dashed"` karşılaştırma |
| `BarChart` | `data: [{ label, value }]`, `color`, `seriesLabel` | Tek serili dikey bar |
| `StackedBarChart` | `data: [{ label, values: Record<key, number> }]`, `series: [{ key, label, color? }]` | Araç masraf trendi |
| `HorizontalBarChart` | `data: [{ label, value, color? }]`, `valueType: percent \| number` | Hasar analizi |
| `DonutChart` | `data: [{ label, value, color }]`, `centerValue`, `centerLabel`, `onSelect`, `size`, `layout` | Bugünkü operasyon |
| `BreakdownChart` | `data: [{ label, value, color?, valueLabel? }]`, `relativeTo: total \| max` | Gider dağılımı |
| `ChartLegend`, `ChartSummary` | `items`, `net` | Grafik üstü özet / lejant |

Kurallar:
- Her grafiğe **zorunlu** `aria-label` ver. StackedBar ekran okuyucu için gizli veri tablosu üretir; Area/Line ok tuşlarıyla gezilebilir.
- Renkleri `chartColors`, `categoricalPalette`, `statusPalette` (`@/design-system`) üzerinden ver; hex yazma.
- Para formatı varsayılanı `₺` + `tr-TR`. Farklı birim için `formatValue` / `formatYAxis` geç.
- Grafikler bir `Card` içinde, referanstaki boşluklarla kullanılır (örn. `ChartSummary` → `margin: 25px 22px 0`, grafik → `margin: 13px 21px 9px`).
- Pie chart referansta **yoktur**; gerekirse önce kullanıcıya sor.

---

## 8. Erişilebilirlik kontrol listesi

- Icon-only buton → `IconButton` + anlamlı Türkçe `aria-label`.
- Form kontrolü → `FormField` içinde (label + hata bağlantısı otomatik). Label'sız kontrol yasak; görsel label yoksa `aria-label`.
- Tıklanabilir satır/kart → `button` veya `DataTable onRowClick` (klavye `Enter` desteği hazır). `div onClick` yazma.
- Modal/Drawer/Menu kendi focus yönetimini yapar; elle `tabIndex` hilesi ekleme.
- Renk tek başına anlam taşımaz: Badge'de metin, grafikte lejant/etiket bulunur.
- Focus görünürlüğü global (`base.css`) — `outline: none` yazma.
- Animasyonlar `prefers-reduced-motion`'a uyar; yeni animasyon eklerken token süreleri kullan.

---

## 9. Dil, içerik ve biçim

- Arayüz dili **Türkçe**. Büyük/küçük harf dönüşümünde `toLocaleUpperCase("tr")` / `toLocaleLowerCase("tr")` kullan (İ/ı sorunu).
- Sayılar: `toLocaleString("tr-TR")`; para `₺24.500`; yüzde `%24,1`; tarih `03.11.2026` veya `3 Kasım 2026`.
- Eyebrow metinleri BÜYÜK HARF (`OPERASYON`), buton metinleri cümle düzeninde ("Yeni sefer", "Dışa aktar").
- Varsayılan metinler (EmptyState, Toast kapatma, Pagination etiketleri) Türkçedir; gerekiyorsa prop ile değiştir.

---

## 10. Yeni bileşen ekleme / değiştirme süreci

1. **Önce ara:** Benzer bir bileşen var mı? Varsa varyant/prop ekle.
2. **Referansı kontrol et:** Figma Make tasarımında karşılığı var mı? Yoksa türetildiğini dosya başında JSDoc ile belirt ve kullanıcıya bildir.
3. Dosyaları oluştur: `components/<Name>/<Name>.tsx` + `<Name>.module.css`.
   - Named export (`export function Name`), `…Props` arayüzü export edilir.
   - Native HTML prop'larını genişlet (`extends ButtonHTMLAttributes<…>`); çakışan tipleri `Omit` et (`title`, `name` gibi).
   - `className` kabul et, `cn()` ile birleştir; gerekiyorsa `forwardRef`.
   - State/handler/effect varsa dosyanın başına `"use client"`.
   - Kontrollü + kontrolsüz kullanım için `useControllableState`; dışarı tıklama için `useDismiss`; dialog için `useFocusTrap`; portal için `useIsClient`.
   - Design system içi import'lar göreli yoldan.
4. `src/design-system/index.ts`'e export ekle (bileşen + prop tipleri).
5. Bu dosyadaki kataloğu (§6) güncelle.
6. Doğrula:

```bash
npx tsc --noEmit      # tip hatası yok
npm run lint          # React Compiler kuralları dahil (render sırasında ref okuma yok, render'da değişken mutasyonu yok)
npm run build         # production build başarılı
npm run icons         # (ikon eklendiyse)
```

ESLint `react-hooks` kuralları React Compiler uyumluluğunu denetler: render sırasında `ref.current` okuma, render içinde dış değişkeni yeniden atama (`let x; arr.map(() => x += …)`) hata verir — `reduce` veya event handler kullan.

---

## 11. Türetilmiş (referansta birebir olmayan) parçalar

Kullanıcı istediği için eklendi; görsel dil mevcut token'lardan türetildi. Değiştirmeden önce tasarım onayı alınmalı:

- `Button variant="danger"`, `Spinner`, `Radio` / `RadioGroup`, `Accordion`, `Pagination variant="full"`, genel amaçlı `Tooltip`
- `Drawer side="right"` (sol taraf = referanstaki mobil menü)
- `Alert tone="warning"`, form doğrulama hata kenarlığı ve mesajı
- Hata toast'ının ikonu ve renkleri (referansta hata toast'ı da yeşil tik gösteriyordu)
- `LineChart` ve `BarChart` (referanstaki alan ve yığılmış bar grafiklerinden türetildi)

**Bilinen tasarım notu:** Referans CSS'te yüzeylerin bir kısmı nötr griye taşınmış, bir kısmı (notice, toast, empty, timeline, modal) eski zeytin-yeşili tonda kalmış. Bu tonlar `--color-sage-*` grubunda korunuyor. Tek palete geçiş kararı tasarım ekibine aittir; yeni bileşenlerde **nötr `ink`/`surface`/`border` token'larını tercih et**, sage'i sadece geri bildirim yüzeylerinde kullan.

---

## 12. Kapsam dışı

- Pazarlama/tanıtım sitesi (Make'te `src/marketing/`, ayrı CSS ve renk dili) bu design system'e dahil değildir.
- Badge tonunu metinden tahmin etmek gibi iş kuralları bileşenlerde yoktur; feature katmanında yazılır (örn. `statusTone(status): BadgeTone`).
