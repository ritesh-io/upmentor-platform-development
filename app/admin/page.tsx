import { Platform } from "@/components/upmentor/platform"
import { requirePageRole } from "@/lib/auth-roles"
import { getAdminCohortData } from "@/lib/upmentor-cohorts"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const principal = await requirePageRole("admin")
  const initialAdminData = await getAdminCohortData()
  return <Platform role="admin" mode="authenticated" sessionUser={principal.user} initialAdminData={initialAdminData} />
}
