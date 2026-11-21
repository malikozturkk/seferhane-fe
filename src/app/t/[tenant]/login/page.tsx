import { Suspense } from "react"
import { LoginScreen } from "@/modules/auth/LoginScreen"

export const metadata = { title: "Giriş · Seferhane" }

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  )
}
