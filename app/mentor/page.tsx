import { Platform } from "@/components/upmentor/platform"
import { isAdminBootstrapped, requirePageRole } from "@/lib/auth-roles"
import { getLearningResourceWorkspace } from "@/lib/upmentor-resources"

export default async function MentorPage() {
  const principal = await requirePageRole("mentor")
  const [showAdminSetup, resourceWorkspace] = await Promise.all([
    isAdminBootstrapped().then((bootstrapped) => !bootstrapped),
    getLearningResourceWorkspace(principal.user.id, "mentor"),
  ])
  return <Platform role="mentor" mode="authenticated" sessionUser={principal.user} showAdminSetup={showAdminSetup} resourceWorkspace={resourceWorkspace} />
}
