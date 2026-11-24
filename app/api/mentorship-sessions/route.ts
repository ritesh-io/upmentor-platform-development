import { NextResponse } from "next/server"
import { getRequestPrincipal, hasTrustedOrigin } from "@/lib/auth-roles"
import { mentorshipSessionCreateSchema } from "@/lib/upmentor-ai-contracts"
import { readGuardedJson } from "@/lib/upmentor-api-guard"
import { createMentorshipSession, getMentorshipWorkspace } from "@/lib/upmentor-sessions"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  if (principal.role !== "mentor" && principal.role !== "mentee") {
    return NextResponse.json({ error: "Mentor or mentee access is required." }, { status: 403 })
  }

  try {
    const workspace = await getMentorshipWorkspace(principal.user.id, principal.role)
    return NextResponse.json(workspace, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[mentorship-sessions] load failed", error)
    return NextResponse.json({ error: "Mentorship sessions could not be loaded." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  if (principal.role !== "mentor") return NextResponse.json({ error: "A mentor account is required." }, { status: 403 })

  const guarded = await readGuardedJson(request, mentorshipSessionCreateSchema, "mentorship-session-create", principal.user.id)
  if ("response" in guarded) return guarded.response

  try {
    const session = await createMentorshipSession(principal.user.id, guarded.value)
    if (!session) return NextResponse.json({ error: "You can only schedule sessions with a mentee assigned to one of your cohorts." }, { status: 403 })
    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error("[mentorship-sessions] create failed", error)
    return NextResponse.json({ error: "The mentorship session could not be saved." }, { status: 500 })
  }
}
