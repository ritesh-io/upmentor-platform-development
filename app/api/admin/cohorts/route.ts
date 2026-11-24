import { NextResponse } from "next/server"
import { z } from "zod"
import { getRequestPrincipal, hasTrustedOrigin } from "@/lib/auth-roles"
import { changeCohortMembership, createProgramCohort, getAdminCohortData } from "@/lib/upmentor-cohorts"
import { readGuardedJson } from "@/lib/upmentor-api-guard"

export const dynamic = "force-dynamic"

const trackSchema = z.enum(["Web Development", "DSA in C/C++", "AI/ML", "Other"])
const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  track: trackSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }),
  leadMentorId: z.string().max(128).optional().or(z.literal("")),
}).strict()
const assignSchema = z.union([
  z.object({ cohortId: z.string().min(1).max(128), mentorId: z.string().min(1).max(128) }).strict(),
  z.object({ cohortId: z.string().min(1).max(128), menteeId: z.string().min(1).max(128) }).strict(),
])

async function requireAdmin(request: Request) {
  const principal = await getRequestPrincipal(request.headers)
  if (!principal) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) }
  if (principal.role !== "admin") return { response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) }
  return { principal }
}

export async function GET(request: Request) {
  const access = await requireAdmin(request)
  if ("response" in access) return access.response
  try {
    return NextResponse.json(await getAdminCohortData())
  } catch (error) {
    console.error("[admin-cohorts] load failed", error)
    return NextResponse.json({ error: "Cohorts and mentor accounts could not be loaded." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const access = await requireAdmin(request)
  if ("response" in access) return access.response
  const guarded = await readGuardedJson(request, createSchema, "admin-cohorts-create")
  if ("response" in guarded) return guarded.response

  try {
    const { name, track, startDate, leadMentorId } = guarded.value
    if (leadMentorId) {
      const data = await getAdminCohortData()
      if (!data.mentors.some((mentor) => mentor.id === leadMentorId)) {
        return NextResponse.json({ error: "Choose an active mentor account." }, { status: 400 })
      }
    }
    const cohort = await createProgramCohort({ name, track, startDate, ...(leadMentorId ? { leadMentorId } : {}) })
    return NextResponse.json({ cohort }, { status: 201 })
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "A cohort with this name and start date already exists." }, { status: 409 })
    }
    console.error("[admin-cohorts] create failed", error)
    return NextResponse.json({ error: "The cohort could not be created." }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const access = await requireAdmin(request)
  if ("response" in access) return access.response
  const guarded = await readGuardedJson(request, assignSchema, "admin-cohorts-assign")
  if ("response" in guarded) return guarded.response

  try {
    const result = "mentorId" in guarded.value
      ? await changeCohortMembership(guarded.value.cohortId, guarded.value.mentorId, "mentor", "add")
      : await changeCohortMembership(guarded.value.cohortId, guarded.value.menteeId, "mentee", "add")
    if (result.kind === "user-missing") return NextResponse.json({ error: `Choose an active ${"mentorId" in guarded.value ? "mentor" : "student"} account.` }, { status: 400 })
    if (result.kind === "cohort-missing") return NextResponse.json({ error: "The cohort no longer exists. Refresh and try again." }, { status: 404 })
    return NextResponse.json({ cohort: result.cohort })
  } catch (error) {
    console.error("[admin-cohorts] assignment failed", error)
    return NextResponse.json({ error: "The mentor could not be assigned." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 })
  const access = await requireAdmin(request)
  if ("response" in access) return access.response
  const guarded = await readGuardedJson(request, assignSchema, "admin-cohorts-remove-mentor")
  if ("response" in guarded) return guarded.response

  try {
    const result = "mentorId" in guarded.value
      ? await changeCohortMembership(guarded.value.cohortId, guarded.value.mentorId, "mentor", "remove")
      : await changeCohortMembership(guarded.value.cohortId, guarded.value.menteeId, "mentee", "remove")
    if (result.kind === "cohort-missing") return NextResponse.json({ error: "The cohort no longer exists. Refresh and try again." }, { status: 404 })
    return NextResponse.json({ cohort: result.cohort })
  } catch (error) {
    console.error("[admin-cohorts] mentor removal failed", error)
    return NextResponse.json({ error: "The mentor could not be removed." }, { status: 500 })
  }
}
