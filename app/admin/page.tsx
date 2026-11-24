import { Platform } from "@/components/upmentor/platform"
import { requirePageRole } from "@/lib/auth-roles"
import { getAdminCohortData } from "@/lib/upmentor-cohorts"
import { getLearningResourceWorkspace } from "@/lib/upmentor-resources"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const principal = await requirePageRole("admin")
  const [initialAdminData, resourceWorkspace] = await Promise.all([
    getAdminCohortData(),
    getLearningResourceWorkspace(principal.user.id, "admin"),
  ])
  return <Platform role="admin" mode="authenticated" sessionUser={principal.user} initialAdminData={initialAdminData} resourceWorkspace={resourceWorkspace} />
}
