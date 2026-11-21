import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Stateless signed session cookie (HMAC-SHA256). The cookie is host-only, so a
 * session created on `alpcengiz.seferhane.com` is never sent to another tenant.
 * A real backend replaces this with its own auth (JWT / opaque session).
 */
const SECRET = process.env.SESSION_SECRET ?? "seferhane-dev-secret-change-me"
const MAX_AGE_SECONDS = 60 * 60 * 12

export interface SessionPayload {
  uid: string
  /** Tenant id, or null for platform/partner users. */
  tid: string | null
  exp: number
}

const sign = (value: string) => createHmac("sha256", SECRET).update(value).digest("base64url")

export function encodeSession(uid: string, tid: string | null): { value: string; maxAge: number } {
  const payload: SessionPayload = { uid, tid, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS }
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return { value: `${body}.${sign(body)}`, maxAge: MAX_AGE_SECONDS }
}

export function decodeSession(value: string | undefined | null): SessionPayload | null {
  if (!value) return null
  const [body, signature] = value.split(".")
  if (!body || !signature) return null
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload
    return payload.exp > Date.now() / 1000 ? payload : null
  } catch {
    return null
  }
}
