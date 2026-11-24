import { NextResponse } from "next/server"
import { z } from "zod"
import { getRequestPrincipal, hasTrustedOrigin } from "@/lib/auth-roles"
import { authDb } from "@/lib/mongodb"
import { readGuardedJson } from "@/lib/upmentor-api-guard"
import type { Roadmap } from "@/lib/upmentor-demo-data"

export const dynamic = "force-dynamic"

const submissionSchema = z.object({
  taskId: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  url: z.string().trim().max(2048).refine((value) => !value || /^https:\/\//i.test(value), "Submission links must use HTTPS."),
}).strict()

type MenteeProfileRecord = { _id: string; roadmap: Roadmap }
const profiles = authDb.collection<MenteeProfileRecord>("mentee_learning_profiles")

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  if (principal.role !== "mentee") return NextResponse.json({ error: "A mentee account is required." }, { status: 403 })

  const guarded = await readGuardedJson(request, submissionSchema, "mentee-task-submission")
  if ("response" in guarded) return guarded.response

  try {
    const { taskId, description, url } = guarded.value
    const record = await profiles.findOne({ _id: principal.user.id })
    if (!record) return NextResponse.json({ error: "Complete your learning profile before submitting work." }, { status: 404 })

    const location = record.roadmap.stages.flatMap((stage, stageIndex) =>
      stage.tasks.map((task, taskIndex) => ({ task, stageIndex, taskIndex })),
    ).find(({ task }) => task.id === taskId)
    if (!location) return NextResponse.json({ error: "That task was not found in your roadmap." }, { status: 404 })
    if (location.task.status === "approved" || location.task.status === "submitted") {
      return NextResponse.json({ error: "This task cannot be submitted in its current status." }, { status: 409 })
    }

    const submittedAt = new Date().toISOString()
    const taskPath = `roadmap.stages.${location.stageIndex}.tasks.${location.taskIndex}`
    const result = await profiles.updateOne(
      { _id: principal.user.id, [`${taskPath}.status`]: location.task.status },
      { $set: {
        [`${taskPath}.status`]: "submitted",
        [`${taskPath}.submission`]: { description, url, submittedAt },
        updatedAt: new Date(),
      } },
    )
    if (!result.matchedCount) return NextResponse.json({ error: "This task changed while you were submitting. Refresh and try again." }, { status: 409 })

    const updated = await profiles.findOne({ _id: principal.user.id })
    if (!updated) return NextResponse.json({ error: "Your submission was saved, but the updated roadmap could not be loaded." }, { status: 500 })
    return NextResponse.json({ roadmap: updated.roadmap })
  } catch (error) {
    console.error("[mentee-tasks] submission save failed", error)
    return NextResponse.json({ error: "Your submission could not be saved. Please try again." }, { status: 500 })
  }
}
