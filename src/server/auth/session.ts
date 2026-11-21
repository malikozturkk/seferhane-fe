import "server-only"
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

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

function verify(value: string | undefined | null): unknown {
  if (!value) return null
  const [body, signature] = value.split(".")
  if (!body || !signature) return null
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString())
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Sign-in handoff: apex login → workspace subdomain                    */
/* ------------------------------------------------------------------ */

/**
 * The session cookie is host-only (tenant isolation), so the apex login page
 * can't set it for `<slug>.seferhane.com`. Instead it issues a short-lived,
 * single-use signed token; the workspace host exchanges it for its own cookie
 * at `/api/v1/auth/callback`.
 */
export interface HandoffPayload {
  kind: "handoff"
  uid: string
  tid: string | null
  /** Path to open after sign-in (same workspace only). */
  next: string | null
  jti: string
  exp: number
}

const HANDOFF_TTL_SECONDS = 60
const g = globalThis as unknown as { __seferhaneUsedHandoffs?: Set<string> }
const usedHandoffs = (g.__seferhaneUsedHandoffs ??= new Set<string>())

export function encodeHandoff(uid: string, tid: string | null, next: string | null) {
  const payload: HandoffPayload = {
    kind: "handoff",
    uid,
    tid,
    next,
    jti: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + HANDOFF_TTL_SECONDS,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${body}.${sign(body)}`
}

/** Verifies and burns a handoff token (single use). */
export function consumeHandoff(token: string | null): HandoffPayload | null {
  const p = verify(token) as HandoffPayload | null
  if (!p || p.kind !== "handoff" || p.exp <= Date.now() / 1000 || usedHandoffs.has(p.jti)) return null
  usedHandoffs.add(p.jti)
  return p
}

export function decodeSession(value: string | undefined | null): SessionPayload | null {
  const p = verify(value) as (SessionPayload & { kind?: string }) | null
  // Handoff tokens share the signature scheme but are never valid sessions.
  if (!p || p.kind || !p.uid || p.exp <= Date.now() / 1000) return null
  return { uid: p.uid, tid: p.tid, exp: p.exp }
}
