/**
 * Single source of truth for panel modules (Ürün planı §5, 19 modül).
 * Drives the sidebar, breadcrumbs, global search, route guards and page
 * headers. "Sefer kapanışı" (5.4) lives as a tab inside the trip detail.
 */
import type { ComponentType } from "react"
import {
  Building2Icon,
  ChartNoAxesCombinedIcon,
  ChartPieIcon,
  ClipboardCheckIcon,
  FolderOpenIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  MessagesSquareIcon,
  PanelsTopLeftIcon,
  ReceiptTextIcon,
  RouteIcon,
  Settings2Icon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TruckIcon,
  UsersRoundIcon,
  WalletIcon,
  WorkflowIcon,
  type IconProps,
} from "@/design-system"
import type { Resource } from "@/shared/auth/permissions"

export type ModuleGroup = "OPERASYON" | "UYUM & BELGE" | "KAYNAKLAR" | "TİCARİ" | "YÖNETİM" | "SİSTEM"
export type Phase = "MVP" | "Faz 2" | "Faz 3"

export interface ModuleDef {
  id: string
  /** Path inside the tenant app ("" = dashboard). */
  path: string
  name: string
  group: ModuleGroup
  icon: ComponentType<IconProps>
  phase: Phase
  description: string
  /** Permission resource that guards the module. */
  resource: Resource
  tabs?: string[]
  /** Sidebar badge key returned by `GET /me` (`badges`). */
  badge?: { key: string; tone: "subtle" | "alert" }
  isNew?: boolean
  /** Label of the main "create" button on list pages. */
  createLabel?: string
}

export const MODULES: ModuleDef[] = [
  {
    id: "dashboard",
    path: "",
    name: "Genel bakış",
    group: "OPERASYON",
    icon: LayoutDashboardIcon,
    phase: "MVP",
    description: "Operasyonunuzun nabzı, tek bir ekranda.",
    resource: "dashboard",
  },
  {
    id: "planning",
    path: "planning",
    name: "Sefer planlama",
    group: "OPERASYON",
    icon: RouteIcon,
    phase: "MVP",
    description: "Kaynaklarınızı eşleştirin, günü güvenle planlayın.",
    resource: "planning",
  },
  {
    id: "operations",
    path: "operations",
    name: "Operasyon dosyaları",
    group: "OPERASYON",
    icon: FolderOpenIcon,
    phase: "MVP",
    description: "Her seferin hikâyesi, tek bir dijital dosyada.",
    resource: "trips",
    tabs: ["Tüm seferler", "Aktif seferler", "Planlandı", "Evrak bekliyor", "Tamamlandı"],
    createLabel: "Yeni sefer",
  },
  {
    id: "documents",
    path: "documents",
    name: "Belge & uyum",
    group: "UYUM & BELGE",
    icon: ShieldCheckIcon,
    phase: "MVP",
    description: "Her belge yerinde, her sefer güvenle yolda.",
    resource: "documents",
    tabs: ["Tüm belgeler", "Süresi yaklaşanlar", "Onay bekleyenler", "Geçiş belgesi kotaları", "Arşiv"],
    badge: { key: "documents", tone: "alert" },
    createLabel: "Belge yükle",
  },
  {
    id: "quality",
    path: "quality",
    name: "Kalite & denetim",
    group: "UYUM & BELGE",
    icon: ClipboardCheckIcon,
    phase: "Faz 2",
    description: "Denetime her zaman hazır bir operasyon.",
    resource: "quality",
    tabs: ["Denetimler", "Uygunsuzluk & DÖF", "Eğitimler", "SOP kütüphanesi"],
    createLabel: "Denetim oluştur",
  },
  {
    id: "fleet",
    path: "fleet",
    name: "Filo & bakım",
    group: "KAYNAKLAR",
    icon: TruckIcon,
    phase: "MVP",
    description: "Filonuzun sağlığı, kapasitesi ve tüm geçmişi.",
    resource: "fleet",
    tabs: ["Araçlar", "Araç maliyetleri", "Bakım takvimi", "Servis & arıza", "Lastikler", "Yakıt & cezalar"],
    createLabel: "Araç ekle",
  },
  {
    id: "people",
    path: "people",
    name: "Çalışanlar & İK",
    group: "KAYNAKLAR",
    icon: UsersRoundIcon,
    phase: "MVP",
    description: "Şoförleriniz ve ofis ekibiniz; belgeler, araç zimmeti ve özlük bilgileri bir arada.",
    resource: "people",
    tabs: ["Çalışanlar", "Puantaj & izin", "Avans & masraf", "Performans", "Yurt dışı günleri"],
    createLabel: "Çalışan ekle",
  },
  {
    id: "customers",
    path: "customers",
    name: "Müşteri & teklif",
    group: "TİCARİ",
    icon: Building2Icon,
    phase: "Faz 2",
    description: "Müşteri ilişkilerinden onaylanan tekliflere.",
    resource: "customers",
    tabs: ["Müşteriler", "Teklifler", "Tarifeler", "Görüşme notları"],
    createLabel: "Müşteri ekle",
  },
  {
    id: "costs",
    path: "costs",
    name: "Maliyet & kârlılık",
    group: "TİCARİ",
    icon: ChartNoAxesCombinedIcon,
    phase: "MVP",
    description: "Her seferin maliyeti, her kararın karşılığı görünür.",
    resource: "costs",
    tabs: ["Genel bakış", "Sefer kârlılığı", "Müşteri bazlı", "Hat bazlı", "Bütçe & gerçekleşen"],
  },
  {
    id: "invoices",
    path: "invoices",
    name: "Fatura & tahsilat",
    group: "TİCARİ",
    icon: ReceiptTextIcon,
    phase: "Faz 2",
    description: "Eksiksiz evraktan, eksiksiz fatura hazırlığına.",
    resource: "invoices",
    tabs: ["Fatura hazırlığı", "Tahsilat takibi", "ERP aktarım geçmişi"],
    createLabel: "Hazırlık dosyası oluştur",
  },
  {
    id: "ledger",
    path: "ledger",
    name: "Cari hesaplar",
    group: "TİCARİ",
    icon: WalletIcon,
    phase: "MVP",
    description: "Kimin kime ne kadar borcu var, ne zaman tahsil edilecek — tek ekranda.",
    resource: "ledger",
    tabs: ["Tüm kayıtlar", "Alacaklarımız", "Borçlarımız", "Vadesi gelenler", "Kapananlar"],
    badge: { key: "ledger", tone: "alert" },
  },
  {
    id: "tasks",
    path: "tasks",
    name: "Görev & iş akışı",
    group: "YÖNETİM",
    icon: ListTodoIcon,
    phase: "MVP",
    description: "Her işin bir sahibi, her adımın bir zamanı var.",
    resource: "tasks",
    tabs: ["Tüm görevler", "Bana atananlar", "Onay bekleyenler", "İş akışı şablonları"],
    badge: { key: "tasks", tone: "subtle" },
    createLabel: "Görev oluştur",
  },
  {
    id: "claims",
    path: "claims",
    name: "Hasar & şikâyet",
    group: "YÖNETİM",
    icon: ShieldAlertIcon,
    phase: "MVP",
    description: "İlk bildirimden çözüme, tüm süreç kontrolünüzde.",
    resource: "claims",
    tabs: ["Açık dosyalar", "İncelemede", "Kapanan dosyalar", "Hasar analizi"],
    createLabel: "Dosya aç",
  },
  {
    id: "messages",
    path: "messages",
    name: "İletişim & duyurular",
    group: "YÖNETİM",
    icon: MessagesSquareIcon,
    phase: "Faz 2",
    description: "Konuşmalar kaybolmasın, operasyonunuzda kalsın.",
    resource: "messages",
  },
  {
    id: "reports",
    path: "reports",
    name: "Raporlar & analitik",
    group: "YÖNETİM",
    icon: ChartPieIcon,
    phase: "MVP",
    description: "Verinizi, bir sonraki doğru karara dönüştürün.",
    resource: "reports",
    tabs: ["Rapor kütüphanesi", "Kayıtlı raporlar", "Zamanlanmış raporlar"],
  },
  {
    id: "automation",
    path: "automation",
    name: "Otomasyon",
    group: "YÖNETİM",
    icon: WorkflowIcon,
    phase: "Faz 3",
    description: "Tekrarlayan işleri kurallara, zamanınızı operasyona bırakın.",
    resource: "automation",
    tabs: ["Kurallarım", "Hazır kural kütüphanesi", "Çalıştırma geçmişi"],
    isNew: true,
  },
  {
    id: "portal",
    path: "portal-preview",
    name: "Müşteri portalı",
    group: "YÖNETİM",
    icon: PanelsTopLeftIcon,
    phase: "Faz 2",
    description: "Müşterileriniz için şeffaf, güvenli bir çalışma alanı.",
    resource: "portal",
  },
  {
    id: "settings",
    path: "settings",
    name: "Ayarlar & kullanıcılar",
    group: "SİSTEM",
    icon: Settings2Icon,
    phase: "MVP",
    description: "Seferhane’yi şirketinizin çalışma şekline uyarlayın.",
    resource: "settings",
    tabs: [
      "Şirket bilgileri",
      "Kullanıcılar & roller",
      "Belge & sefer şablonları",
      "Bildirimler",
      "Aktivite kayıtları",
      "Paket & kullanım",
    ],
  },
]

export const NAV_GROUPS: ModuleGroup[] = ["OPERASYON", "UYUM & BELGE", "KAYNAKLAR", "TİCARİ", "YÖNETİM"]

export const moduleById = (id: string) => MODULES.find((m) => m.id === id)

/** Resolve the active module from a tenant-relative pathname ("/operations/SFR-1"). */
export function moduleFromPath(pathname: string): ModuleDef | undefined {
  const first = pathname.split("/").filter(Boolean)[0] ?? ""
  return MODULES.find((m) => m.path === first) ?? (first === "" ? MODULES[0] : undefined)
}

/** Tenant-relative href. */
export const moduleHref = (m: ModuleDef) => `/${m.path}`
