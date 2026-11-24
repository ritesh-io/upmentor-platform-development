import "server-only"
import { createHmac } from "node:crypto"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { z } from "zod"

const MAX_BODY_BYTES = 16_384
const MAX_REQUESTS_PER_MINUTE = 12
const requestWindows = new Map<string, { count: number; resetsAt: number }>()
let sharedRateLimiter: Ratelimit | undefined

type GuardResult<T> = { value: T } | { response: Response }

function getSharedRateLimiter() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  sharedRateLimiter ??= new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_MINUTE, "60 s"),
    prefix: "upmentor:api",
    analytics: false,
  })
  return sharedRateLimiter
}

function rateLimitKey(scope: string, identity: string) {
  const secret = process.env.BETTER_AUTH_SECRET || "upmentor-local-rate-limit"
  const digest = createHmac("sha256", secret).update(`${scope}:${identity}`).digest("hex")
  return `${scope}:${digest}`
}

async function enforceRateLimit(request: Request, scope: string, principalId?: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const identity = principalId ? `user:${principalId}` : `ip:${forwardedFor || "local"}`
  const key = rateLimitKey(scope, identity)
  const limiter = getSharedRateLimiter()

  if (limiter) {
    try {
      const result = await limiter.limit(key)
      if (result.success) return null
      const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
      return Response.json(
        { error: "Please wait before requesting another generation." },
        { status: 429, headers: { "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(result.limit), "X-RateLimit-Remaining": String(result.remaining) } },
      )
    } catch {
      return Response.json({ error: "Shared rate limiting is temporarily unavailable." }, { status: 503 })
    }
  }

  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Shared rate limiting is not configured." }, { status: 503 })
  }

  const now = Date.now()
  const current = requestWindows.get(key)
  if (current && current.resetsAt > now && current.count >= MAX_REQUESTS_PER_MINUTE) {
    const retryAfter = Math.max(1, Math.ceil((current.resetsAt - now) / 1000))
    return Response.json({ error: "Please wait before requesting another generation." }, { status: 429, headers: { "Retry-After": String(retryAfter) } })
  }
  requestWindows.set(key, current && current.resetsAt > now ? { ...current, count: current.count + 1 } : { count: 1, resetsAt: now + 60_000 })
  if (requestWindows.size > 500) {
    for (const [entryKey, window] of requestWindows) if (window.resetsAt <= now) requestWindows.delete(entryKey)
  }
  return null
}

export async function readGuardedJson<T>(request: Request, schema: z.ZodType<T>, scope: string, principalId?: string): Promise<GuardResult<T>> {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host
  if (origin) {
    try {
      if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) {
        return { response: Response.json({ error: "Request origin is not allowed." }, { status: 403 }) }
      }
    } catch {
      return { response: Response.json({ error: "Request origin is not allowed." }, { status: 403 }) }
    }
  }

  const contentLength = Number(request.headers.get("content-length") || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return { response: Response.json({ error: "Request is too large." }, { status: 413 }) }
  }

  const rateLimitResponse = await enforceRateLimit(request, scope, principalId)
  if (rateLimitResponse) return { response: rateLimitResponse }

  let body: string
  try {
    body = await request.text()
  } catch {
    return { response: Response.json({ error: "Request body could not be read." }, { status: 400 }) }
  }
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
    return { response: Response.json({ error: "Request is too large." }, { status: 413 }) }
  }

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return { response: Response.json({ error: "Request body must be valid JSON." }, { status: 400 }) }
  }
  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return { response: Response.json({ error: "Some request fields are missing or invalid." }, { status: 400 }) }
  }
  return { value: parsed.data }
}
