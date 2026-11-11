import { Platform } from "@/components/upmentor/platform"
import { isAdminBootstrapped, requirePageRole } from "@/lib/auth-roles"

export default async function MentorPage() {
  const principal = await requirePageRole("mentor")
  const showAdminSetup = !(await isAdminBootstrapped())
  return <Platform role="mentor" mode="authenticated" sessionUser={principal.user} showAdminSetup={showAdminSetup} />
}
