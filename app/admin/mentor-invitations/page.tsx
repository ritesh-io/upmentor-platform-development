import Link from "next/link"
import { AuthShell } from "@/components/upmentor/auth-shell"
import { MentorInviteManager } from "@/components/upmentor/mentor-invite-manager"
import { requirePageRole } from "@/lib/auth-roles"

export default async function MentorInvitationsPage() {
  await requirePageRole("admin")

  return (
    <AuthShell
      eyebrow="Program administration"
      title="Invite a mentor"
      description="Mentor access is granted through a single-use invitation, not a public role selector."
      footer={<Link href="/admin" className="font-semibold text-[#4f46e5] hover:underline">Return to the program workspace</Link>}
    >
      <MentorInviteManager />
    </AuthShell>
  )
}
