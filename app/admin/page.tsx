import { Platform } from "@/components/upmentor/platform"
import { requirePageRole } from "@/lib/auth-roles"

export default async function AdminPage() {
  const principal = await requirePageRole("admin")
  return <Platform role="admin" mode="authenticated" sessionUser={principal.user} />
}
