import { Platform } from "@/components/upmentor/platform"
import { isAdminBootstrapped, requirePageRole } from "@/lib/auth-roles"

export default async function MenteePage() {
  const principal = await requirePageRole("mentee")
  const showAdminSetup = !(await isAdminBootstrapped())
  return <Platform role="mentee" mode="authenticated" sessionUser={principal.user} showAdminSetup={showAdminSetup} />
}
