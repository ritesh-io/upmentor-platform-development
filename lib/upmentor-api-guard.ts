import "server-only"
import type { z } from "zod"

const MAX_BODY_BYTES = 16_384
const MAX_REQUESTS_PER_MINUTE = 12
const requestWindows = new Map<string, { count: number; resetsAt: number }>()

type GuardResult<T> = { value: T } | { response: Response }

export async function readGuardedJson<T>(request: Request, schema: z.ZodType<T>, scope: string): Promise<GuardResult<T>> {
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

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const clientKey = `${scope}:${forwardedFor || "local"}`
  const now = Date.now()
  const current = requestWindows.get(clientKey)
  if (current && current.resetsAt > now && current.count >= MAX_REQUESTS_PER_MINUTE) {
    return { response: Response.json({ error: "Please wait before requesting another generation." }, { status: 429, headers: { "Retry-After": String(Math.ceil((current.resetsAt - now) / 1000)) } }) }
  }
  requestWindows.set(clientKey, current && current.resetsAt > now ? { ...current, count: current.count + 1 } : { count: 1, resetsAt: now + 60_000 })
  if (requestWindows.size > 500) {
    for (const [key, window] of requestWindows) if (window.resetsAt <= now) requestWindows.delete(key)
  }

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
