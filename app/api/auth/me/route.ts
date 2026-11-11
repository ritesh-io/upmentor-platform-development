import { NextResponse } from "next/server"
import { getRequestPrincipal } from "@/lib/auth-roles"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  return NextResponse.json({
    role: principal.role,
    user: {
      id: principal.user.id,
      name: principal.user.name,
      email: principal.user.email,
    },
  })
}
