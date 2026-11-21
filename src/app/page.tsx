import { Brand } from "@/design-system"
import { tenantUrl, platformUrl } from "@/shared/tenancy/host"

/** Temporary apex landing until the marketing site is built. */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas p-10 text-center">
      <Brand size="lg" />
      <p className="text-base text-ink-muted">Sefer planından kâra kadar, lojistiğin tamamı tek ekranda.</p>
      <div className="flex flex-col gap-2 text-sm">
        <a className="text-brand underline" href={tenantUrl("alpcengiz")}>alpcengiz — Alp Cengiz Lojistik (Profesyonel)</a>
        <a className="text-brand underline" href={tenantUrl("karadeniz")}>karadeniz — Karadeniz Nakliyat (Başlangıç)</a>
        <a className="text-brand underline" href={platformUrl()}>admin — Platform & partner konsolu</a>
      </div>
    </main>
  )
}
