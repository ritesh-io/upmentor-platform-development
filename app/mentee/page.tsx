import { Platform } from "@/components/upmentor/platform"
import { isAdminBootstrapped, requirePageRole } from "@/lib/auth-roles"
import { getLearningResourceWorkspace } from "@/lib/upmentor-resources"

export default async function MenteePage() {
  const principal = await requirePageRole("mentee")
  const [showAdminSetup, resourceWorkspace] = await Promise.all([
    isAdminBootstrapped().then((bootstrapped) => !bootstrapped),
    getLearningResourceWorkspace(principal.user.id, "mentee"),
  ])
  return <Platform role="mentee" mode="authenticated" sessionUser={principal.user} showAdminSetup={showAdminSetup} resourceWorkspace={resourceWorkspace} />
}
