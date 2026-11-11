import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { createMentorInvite, getRequestPrincipal, hasTrustedOrigin } from "@/lib/auth-roles"

const requestSchema = z.object({
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
})

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  if (principal.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 })

  const payload = requestSchema.safeParse(await request.json().catch(() => null))
  if (!payload.success) return NextResponse.json({ error: "Enter a valid email address or leave it blank." }, { status: 400 })

  try {
    const token = randomBytes(32).toString("base64url")
    const email = payload.data.email?.trim().toLowerCase() || undefined
    const expiresAt = await createMentorInvite(token, principal.user.id, email)
    return NextResponse.json({ path: `/sign-up?invite=${encodeURIComponent(token)}`, expiresAt: expiresAt.toISOString() })
  } catch (error) {
    console.error("[auth] mentor invitation creation failed", error)
    return NextResponse.json({ error: "The invitation could not be created." }, { status: 500 })
  }
}
