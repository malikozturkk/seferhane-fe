# Seferhane — Uygulama Mimarisi

> UI kuralları için `design-system.md`, ürün kapsamı için ürün planı (19 modül).
> Bu dosya: katmanlar, multi-tenant yapı, RBAC, veri akışı ve **gerçek backend'e geçiş**.

## 1. Yüzeyler ve host yönlendirme

| Host | Yüzey | Kod |
|---|---|---|
| `seferhane.com` (apex) | Tanıtım (şimdilik geçici sayfa) + **tek giriş sayfası** `/login` | `src/app/page.tsx`, `src/app/login/` |
| `<slug>.seferhane.com` | Firma paneli, müşteri portalı, magic-link | `src/app/t/[tenant]/**` |
| `admin.seferhane.com` | Platform & partner konsolu | `src/app/platform/**` |

`src/proxy.ts` (Next 16 Proxy) host'u çözer ve iç route ağacına **rewrite** eder:
`alpcengiz.seferhane.com/operations` → `/t/alpcengiz/operations`. Apex'ten `/t/*` ve `/platform/*`
doğrudan açılamaz. Proxy yalnızca *iyimser* oturum kontrolü yapar (cookie yoksa merkezi girişe);
asıl yetkilendirme API'dedir.

### Merkezi giriş

Alt alan adlarının kendi giriş ekranı yoktur; herkes `seferhane.com/login` üzerinden girer:

1. Oturumsuz ziyaret (`alpcengiz.seferhane.com/fleet`) → `seferhane.com/login?next=<mutlak URL>`.
   Proxy bunu kendisi yönlendirmez, `/api/v1/auth/signin`'e rewrite eder: Next.js proxy
   yönlendirmelerinde hedef host kendi iç host'uyla aynıysa `Location`'ı göreli yapar ve alt alan adında döngü oluşur.
2. `POST /api/v1/auth/login` e-posta + şifreyi **tüm** çalışma alanlarında (ve platform kullanıcılarında) arar,
   her eşleşme için kısa ömürlü (60 sn), tek kullanımlık, imzalı bir *handoff* jetonu üretir
   → `{ workspaces: [{ name, kind, host, url }] }`. Tek eşleşmede istemci doğrudan `url`'e gider; birden fazlaysa seçim listesi gösterilir.
3. `GET <slug>.seferhane.com/api/v1/auth/callback?token=…` jetonu yakar, host'un tenant'ıyla eşleştiğini doğrular,
   **host-only** oturum cookie'sini set eder ve `next` (yalnızca aynı çalışma alanındaysa) / `/` / `/portal`'a yönlendirir.
   Platform & iş ortağı kullanıcıları `admin.seferhane.com`'a gider.

Cookie'nin alan adı geneline (`.seferhane.com`) yazılmaması bilinçlidir: bir firmanın oturumu başka firmanın alt alan adına hiç gönderilmez.

- Kök alan: `NEXT_PUBLIC_ROOT_DOMAIN` (varsayılan `localhost:3000`).
- Geliştirme: `http://alpcengiz.localhost:3000`, `http://karadeniz.localhost:3000`, `http://admin.localhost:3000`
  (`next.config.ts` → `allowedDevOrigins: ["*.localhost"]`).
- Host çözümü tek yerde: `src/shared/tenancy/host.ts` (`resolveHost`, `tenantUrl`).

## 2. Katmanlar ve bağımlılık yönü

```
app (route dosyaları — ince)        → modules → entities → shared → design-system
app/api/v1 (route handler'lar)      → server  → shared
```

| Klasör | Sorumluluk | Kural |
|---|---|---|
| `src/app/` | Route segmentleri. Her `page.tsx` yalnızca bir ekran bileşeni render eder. | İş mantığı yok. |
| `src/app-shell/` | Panel kabuğu (sidebar, header, ⌘K arama, bildirim), `ModulePage` (yetki/paket kapısı), `ModuleWorkspace` (standart modül düzeni), oturum hook'ları. | |
| `src/modules/<modül>/` | Modül ekranları (Screen + bileşenler). | Başka modülü import **etmez**. |
| `src/entities/` | Birden çok modülün kullandığı domain UI & API hook'ları (sefer tablosu, yeni sefer modalı, config-driven kayıtlar, lookup'lar). | |
| `src/shared/contracts/` | **API sözleşmesi** — Zod şemaları + TS tipleri (istemci & sunucu ortak). | Backend'e aynen taşınır. |
| `src/shared/auth/` | İzinler, roller, paketler, `can()`. | Saf TS, istemci & sunucu ortak. |
| `src/shared/api/` | `http` istemcisi (tek base URL noktası), TanStack Query yardımcıları. | |
| `src/shared/forms/` | RHF + Zod + DS adaptörleri (`useZodForm`, `FormInput`…, `applyServerErrors`). | |
| `src/shared/ui/` | Domain'den bağımsız uygulama yardımcıları (status badge, liste durumu, timeline…). | |
| `src/server/` | **Mock backend** (bellek içi DB, repository/servis, auth). | Yalnızca `app/api` import eder (`server-only`). |

## 3. Veri akışı

```
Ekran → useApiQuery/useListQuery/useApiMutation (TanStack Query)
      → shared/api/http.ts  (NEXT_PUBLIC_API_URL ?? "/api/v1")
      → app/api/v1/<modül>/[[...path]]/route.ts
      → server/modules/<modül>.ts  (createRouter + defineHandler)
      → server/services/*  (iş kuralları) → server/db/store.ts (tenant bazlı veri)
```

- **Liste sözleşmesi:** `GET /<kaynak>?q=&tab=&filter=&sort=&order=&page=&pageSize=` → `{ items, total, page, pageSize }`.
  Sunucu tarafı: `server/http/list.ts` (`listItems`). İstemci: `useListState` + `DataTable` (kontrollü sıralama) + `ListFooter`.
- **Hatalar:** RFC 7807 benzeri `{ type, title, status, detail, errors }`.
  `400` alan hataları (`applyServerErrors` forma işler), `401`, `403`, `404`, `409` iş kuralı ihlali (bloke araç, çakışma, eksik evrak, paket limiti).
- **Mutation sonrası:** `useApiMutation({ invalidate: [...], success: "..." })` → ilgili query'ler yenilenir, toast gösterilir; `["me"]` her zaman yenilenir (sidebar rozetleri).
- **Demo tarihi:** `shared/lib/clock.ts` → `DEMO_TODAY` (varsayılan 2026-11-03), türetilen durumlar (belge süresi, vade, SLA) tutarlı kalsın diye.

## 4. Multi-tenant

- Her koleksiyon `TenantData` altında tenant'a bağlı (`db.data[tenantId]`) — plan §10 "her tabloda `tenant_id`".
- `defineHandler` her istekte host → tenant → oturum zincirini çözer; oturumun `tid`'si host tenant'ıyla eşleşmezse kullanıcı yok sayılır (401).
- Oturum cookie'si (`sh_session`, HMAC imzalı, HttpOnly) **host-only**'dir; bir tenant'ın oturumu diğerine gitmez. Apex'ten alt alan adına geçiş handoff jetonuyla yapılır (§1).
- Seed: `alpcengiz` (Profesyonel + Dış dünya + Analitik — Make verisi), `karadeniz` (Başlangıç — kilitler/limitler).

## 5. RBAC & paketler

- İzin: `"<kaynak>:<işlem>"` — `shared/auth/permissions.ts` (`RESOURCES`, `ACTIONS`, `RESOURCE_ACTIONS`).
- Roller veridir: sistem şablonları `shared/auth/roles.ts`; tenant özel rol oluşturur/düzenler (Ayarlar → Kullanıcılar & roller → rol editörü). Sistem rolleri düzenlenemez, kopyalanır.
- Paket/kademe: `shared/auth/entitlements.ts` (`PLAN_INFO`, `RESOURCE_PACKAGE`, `TAB_PACKAGE`). Limitler (araç, ofis kullanıcısı) create anında 409.
- **Etkin yetki = rol izni ∧ paket açık** → tek fonksiyon `can()` (`shared/auth/can.ts`), üç noktada:
  1. API: `defineHandler({ permission })` — asıl kaynak.
  2. Sayfa: `ModulePage` / `ModuleWorkspace` (`reason()` → "role" | "package" ekranı, Faz 2 sekme kilidi).
  3. Bileşen: `useAccess().canDo(resource, action)` ile buton gizleme.
- Kullanıcı türleri: `internal` (panel), `external` (portal, `customerId` kapsamı), `platform`, `partner`. Şoförler kullanıcı değildir.
- Partner (plan §11): platform seviyesinde yönlendiren iş ortağı; tenant'a `partnerId` ile bağlı, komisyon = MRR × oran.

## 6. Kalıcılık kuralları (plan §10)

- Her yazım `logActivity` ile denetim izine düşer (`server/services/activity.ts`) → Ayarlar → Aktivite kayıtları.
- Belgeler silinmez, arşivlenir; yenileme eskiyi arşive alır (versiyon zinciri).
- Çalışan silinmez; çıkış tarihi ile "Ayrıldı" olur.
- Para hareketleri ek kayıtla düzeltilir (cari ödemeleri, gider kalemleri).
- Kural motoru (`server/services/ruleEngine.ts`) kuralları veri olarak çalıştırır → görev + bildirim + çalıştırma kaydı.

## 7. Yeni modül / ekran ekleme

1. Sözleşme: `src/shared/contracts/<alan>.ts` → tipler + Zod create/update şemaları.
2. İzin: gerekiyorsa `RESOURCES` + `RESOURCE_ACTIONS` + rol şablonlarına ekle; paket gerekiyorsa `RESOURCE_PACKAGE`.
3. Backend (mock): `src/server/modules/<modül>.ts` → `createRouter({ "GET /": defineHandler({ permission }, fn) ... })`, `app/api/v1/<modül>/[[...path]]/route.ts` ile bağla. Seed'e veri ekle.
4. Kayıt: `src/modules/registry.ts` → id, path, ad, grup, ikon, faz, resource, sekmeler.
5. Ekran: `src/modules/<modül>/<Modül>Screen.tsx` → `ModuleWorkspace` (liste/sekme düzeni) veya `ModulePage` (özel düzen); veri `useListQuery/useApiQuery/useApiMutation`; form `useZodForm` + `Form*` adaptörleri; UI yalnızca design system.
6. Route: `src/app/t/[tenant]/(panel)/<path>/page.tsx` → ekranı render et.
7. Basit ikincil kayıt türleri (Faz 2 sekmeleri) için yeni ekran yazma: `RECORD_KINDS` + `entities/record/kinds.ts` config'i yeterli.

## 8. Gerçek backend'e geçiş

Frontend yeniden yazılmaz; sadece veri kaynağı değişir:

1. Backend `shared/contracts` şemalarını ve §3'teki liste/hata sözleşmesini uygular (Zod şemaları backend'de doğrudan kullanılabilir veya OpenAPI'ye çevrilir).
2. `NEXT_PUBLIC_API_URL=https://api.seferhane.com/v1` ayarlanır. Tenant, host yerine `x-tenant-slug` başlığıyla da iletilebilir (sunucu her ikisini destekler).
3. Oturum: backend `POST /auth/login` (apex, `{ workspaces }` döner) ve `GET /auth/callback` (alt alan adında jetonu cookie'ye çevirir) uçlarını aynı sözleşmeyle uygular; `fetch` zaten `credentials: "include"` ile çalışır. `proxy.ts` iyimser kontrolde cookie adını günceller.
4. `src/server/**` ve `src/app/api/**` silinir. `shared/auth/*` backend'e kopyalanır (tek yetki kaynağı).
5. `DEMO_TODAY` kaldırılır (`clock.today()` → gerçek tarih).

## 9. Yayına alma (subdomain altyapısı)

Kod tarafı (proxy) host → tenant eşlemesini yapar; ama isteklerin uygulamaya ulaşması **sunucu/DNS seviyesinde** ayarlanır.
Firma başına ayar gerekmez — tek bir wildcard yeterlidir, yeni firma platform konsolundan oluşturulduğu anda erişilebilir olur:

1. **DNS:** `seferhane.com` ve `*.seferhane.com` kayıtları aynı uygulamaya (A/CNAME) yönlenir.
2. **TLS:** wildcard sertifika (`*.seferhane.com` + `seferhane.com`); Let's Encrypt'te DNS-01 doğrulaması gerekir.
3. **Barındırma:**
   - Vercel: projeye `seferhane.com` ve `*.seferhane.com` alan adlarını ekleyin (wildcard için nameserver'lar Vercel'de olmalı).
   - Kendi sunucunuz (nginx vb.): `server_name seferhane.com .seferhane.com;` ve `proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme;` ile Next'e iletin. Host başlığı korunmalı — tenant ondan çözülür.
4. **Ortam değişkenleri:** `NEXT_PUBLIC_ROOT_DOMAIN=seferhane.com`, `SESSION_SECRET=<uzun rastgele değer>`.
5. Rezerve alt alan adları (`www`, `api`, `app`, `static`, `cdn`, `admin`) tenant slug'ı olamaz (`shared/tenancy/host.ts`).

Firmanın kendi alan adı (ör. `panel.alpcengiz.com`) ayrı bir iş kalemidir: alan adı başına DNS doğrulaması + sertifika ve `resolveHost`'a özel alan adı → tenant tablosu gerekir.

## 10. Demo hesapları (şifre: `demo1234`)

Giriş: `http://localhost:3000/login` — kullanıcı kendi çalışma alanına yönlendirilir.

| Host | Hesap | Rol |
|---|---|---|
| alpcengiz | muhammet@alpcengizlojistik.com | Şirket yöneticisi |
| alpcengiz | recep@… / ece@… / selin@… / kerem@… / zeynep@… | Müdür / Operasyon / Filo / Finans / Salt okunur |
| alpcengiz | ayse.guner@arcelik.com.tr | Dış kullanıcı (portal) |
| karadeniz | hakan@karadeniznakliyat.com | Şirket yöneticisi (Başlangıç paketi) |
| admin | admin@seferhane.com / oya@guvensigorta.com | Platform yöneticisi / İş ortağı |

Magic-link demoları: `alpcengiz…/link/demo-belge-0838`, `alpcengiz…/link/demo-teklif-082`.
Bellek içi veri sunucu yeniden başlayınca seed'e döner.
