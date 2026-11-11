import { NextResponse } from "next/server"
import { z } from "zod"
import { getRequestPrincipal, hasTrustedOrigin } from "@/lib/auth-roles"
import { authDb } from "@/lib/mongodb"
import { makePersonalizedRoadmap, makeRoadmapFromGenerated, type Roadmap, type UserProfile } from "@/lib/upmentor-demo-data"
import { roadmapContentSchema, roadmapRequestSchema } from "@/lib/upmentor-ai-contracts"
import { readGuardedJson } from "@/lib/upmentor-api-guard"

export const dynamic = "force-dynamic"

const saveSchema = z.object({
  profile: roadmapRequestSchema,
  content: roadmapContentSchema.nullable(),
}).strict()

type MenteeProfileRecord = {
  _id: string
  profile: UserProfile
  roadmap: Roadmap
  source: "ai" | "simulated"
  createdAt: Date
  updatedAt: Date
}

const profiles = authDb.collection<MenteeProfileRecord>("mentee_learning_profiles")

async function getMenteePrincipal(request: Request) {
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) }
  if (principal.role !== "mentee") return { response: NextResponse.json({ error: "A mentee account is required." }, { status: 403 }) }
  return { principal }
}

export async function GET(request: Request) {
  const access = await getMenteePrincipal(request)
  if ("response" in access) return access.response

  try {
    const record = await profiles.findOne({ _id: access.principal.user.id })
    return NextResponse.json(record ? { profile: record.profile, roadmap: record.roadmap, source: record.source } : { profile: null, roadmap: null, source: null })
  } catch (error) {
    console.error("[mentee-profile] load failed", error)
    return NextResponse.json({ error: "Your learning profile could not be loaded." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const access = await getMenteePrincipal(request)
  if ("response" in access) return access.response

  const guarded = await readGuardedJson(request, saveSchema, "mentee-profile")
  if ("response" in guarded) return guarded.response

  try {
    const { profile: submitted, content } = guarded.value
    const existing = await profiles.findOne({ _id: access.principal.user.id })
    const profile: UserProfile = {
      id: access.principal.user.id,
      name: access.principal.user.name,
      email: access.principal.user.email,
      role: "mentee",
      domain: submitted.domain,
      skills: submitted.skills,
      availabilityHours: submitted.weeklyHours,
      weeklyCapacity: Math.max(1, submitted.weeklyHours),
      learningGoal: submitted.goal,
      level: submitted.level,
      targetDate: submitted.targetDate,
    }
    const roadmap = content
      ? makeRoadmapFromGenerated(profile, content, existing?.roadmap)
      : makePersonalizedRoadmap(profile, existing?.roadmap)
    const source = content ? "ai" : "simulated"
    const now = new Date()

    await profiles.updateOne(
      { _id: access.principal.user.id },
      {
        $set: { profile, roadmap, source, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )

    return NextResponse.json({ profile, roadmap, source })
  } catch (error) {
    console.error("[mentee-profile] save failed", error)
    return NextResponse.json({ error: "Your learning profile could not be saved. Please try again." }, { status: 500 })
  }
}
