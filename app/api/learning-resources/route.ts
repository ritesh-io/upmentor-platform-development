import { NextResponse } from "next/server"
import { z } from "zod"
import { getRequestPrincipal, hasTrustedOrigin } from "@/lib/auth-roles"
import { authDb } from "@/lib/mongodb"
import { readGuardedJson } from "@/lib/upmentor-api-guard"
import { createLearningResource } from "@/lib/upmentor-resources"

export const dynamic = "force-dynamic"

const resourceSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(""),
  url: z.string().trim().url().max(2048).refine((value) => {
    try { return new URL(value).protocol === "https:" } catch { return false }
  }, "Resource links must use HTTPS."),
  type: z.enum(["video", "quiz", "project"]),
  cohortId: z.string().trim().max(128).optional().or(z.literal("")),
}).strict()

const cohorts = authDb.collection<{ _id: string; mentorIds: string[] }>("program_cohorts")

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  if (principal.role !== "mentor" && principal.role !== "admin") {
    return NextResponse.json({ error: "Mentor or administrator access is required." }, { status: 403 })
  }

  const guarded = await readGuardedJson(request, resourceSchema, "learning-resource-create")
  if ("response" in guarded) return guarded.response

  try {
    const { title, description, url, type, cohortId: requestedCohortId } = guarded.value
    const cohortId = requestedCohortId || undefined
    if (principal.role === "mentor") {
      if (!cohortId) return NextResponse.json({ error: "Choose one of your assigned cohorts." }, { status: 400 })
      const cohort = await cohorts.findOne({ _id: cohortId, mentorIds: principal.user.id }, { projection: { _id: 1 } })
      if (!cohort) return NextResponse.json({ error: "You can only share resources with cohorts assigned to you." }, { status: 403 })
    } else if (cohortId && !await cohorts.findOne({ _id: cohortId }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: "The selected cohort does not exist." }, { status: 404 })
    }

    const resource = await createLearningResource({ title, description, url, type, ...(cohortId ? { cohortId } : {}), createdBy: principal.user.id })
    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    console.error("[learning-resources] create failed", error)
    return NextResponse.json({ error: "The resource could not be saved." }, { status: 500 })
  }
}
