import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { claimInitialAdmin, checkBootstrapRateLimit, getRequestPrincipal, hasTrustedOrigin } from "@/lib/auth-roles"

const requestSchema = z.object({ code: z.string().min(1).max(256) })

function matchesConfiguredCode(submitted: string, configured: string) {
  const submittedBytes = Buffer.from(submitted)
  const configuredBytes = Buffer.from(configured)
  return submittedBytes.length === configuredBytes.length && timingSafeEqual(submittedBytes, configuredBytes)
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })

  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return NextResponse.json({ error: "Sign in before claiming the administrator account." }, { status: 401 })
  if (principal.role === "admin") return NextResponse.json({ role: "admin" })

  const configuredCode = process.env.UPMENTOR_BOOTSTRAP_ADMIN_CODE
  if (!configuredCode) return NextResponse.json({ error: "Administrator setup is unavailable." }, { status: 503 })
  if (await checkBootstrapRateLimit(request)) return NextResponse.json({ error: "Too many setup attempts. Try again later." }, { status: 429 })

  const payload = requestSchema.safeParse(await request.json().catch(() => null))
  if (!payload.success || !matchesConfiguredCode(payload.data.code, configuredCode)) {
    return NextResponse.json({ error: "The setup code is invalid or setup is already complete." }, { status: 400 })
  }

  try {
    const result = await claimInitialAdmin(principal.user.id)
    if (result === "already-claimed") {
      return NextResponse.json({ error: "The program administrator is already configured." }, { status: 409 })
    }
    return NextResponse.json({ role: "admin" })
  } catch (error) {
    console.error("[auth] administrator bootstrap failed", error)
    return NextResponse.json({ error: "Administrator setup could not be completed." }, { status: 500 })
  }
}
