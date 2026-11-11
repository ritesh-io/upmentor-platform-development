import { NextResponse } from "next/server"
import { z } from "zod"
import { consumeMentorInvite, getRequestPrincipal, hasTrustedOrigin } from "@/lib/auth-roles"

const requestSchema = z.object({ token: z.string().min(32).max(128) })

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return NextResponse.json({ error: "Sign in before using this invitation." }, { status: 401 })
  if (principal.role === "admin" || principal.role === "mentor") {
    return NextResponse.json({ error: "This account already has a program role." }, { status: 409 })
  }

  const payload = requestSchema.safeParse(await request.json().catch(() => null))
  if (!payload.success) return NextResponse.json({ error: "The mentor invitation is invalid or expired." }, { status: 400 })

  try {
    const accepted = await consumeMentorInvite(payload.data.token, principal.user.id, principal.user.email)
    if (!accepted) return NextResponse.json({ error: "The mentor invitation is invalid, expired, or already used." }, { status: 400 })
    return NextResponse.json({ role: "mentor" })
  } catch (error) {
    console.error("[auth] mentor invitation acceptance failed", error)
    return NextResponse.json({ error: "The mentor invitation could not be applied." }, { status: 500 })
  }
}
