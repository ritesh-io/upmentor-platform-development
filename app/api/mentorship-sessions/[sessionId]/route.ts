import { NextResponse } from "next/server"
import { getRequestPrincipal, hasTrustedOrigin } from "@/lib/auth-roles"
import { mentorshipSessionUpdateSchema } from "@/lib/upmentor-ai-contracts"
import { readGuardedJson } from "@/lib/upmentor-api-guard"
import { updateMentorshipSession } from "@/lib/upmentor-sessions"

export const dynamic = "force-dynamic"

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  if (principal.role !== "mentor") return NextResponse.json({ error: "A mentor account is required." }, { status: 403 })

  const { sessionId } = await context.params
  const guarded = await readGuardedJson(request, mentorshipSessionUpdateSchema, "mentorship-session-update", principal.user.id)
  if ("response" in guarded) return guarded.response

  try {
    const result = await updateMentorshipSession(sessionId, principal.user.id, guarded.value)
    if (result.kind === "not-found") return NextResponse.json({ error: "The authorized session could not be found." }, { status: 404 })
    if (result.kind === "not-updatable") return NextResponse.json({ error: "This session cannot be changed in its current state." }, { status: 409 })
    return NextResponse.json({ session: result.session })
  } catch (error) {
    console.error("[mentorship-sessions] update failed", error)
    return NextResponse.json({ error: "The mentorship session could not be updated." }, { status: 500 })
  }
}
