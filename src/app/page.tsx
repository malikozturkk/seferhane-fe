import Link from "next/link"
import { Brand } from "@/design-system"

/** Temporary apex landing until the marketing site is built. */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas p-10 text-center">
      <Brand size="lg" />
      <p className="text-base text-ink-muted">Sefer planından kâra kadar, lojistiğin tamamı tek ekranda.</p>
      <Link className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg shadow-primary hover:bg-primary-hover" href="/login">
        Giriş yap
      </Link>
    </main>
  )
}
