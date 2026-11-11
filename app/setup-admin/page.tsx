import Link from "next/link"
import { AuthShell } from "@/components/upmentor/auth-shell"
import { AdminBootstrapForm } from "@/components/upmentor/admin-bootstrap-form"
import { isAdminBootstrapped, requirePageSession } from "@/lib/auth-roles"

export default async function SetupAdminPage() {
  const principal = await requirePageSession()
  const alreadyConfigured = await isAdminBootstrapped()

  if (alreadyConfigured) {
    return (
      <AuthShell
        eyebrow="Program access"
        title="Administrator setup is complete"
        description="The one-time administrator code can only be claimed once. Ask the existing program administrator to provision your access."
        footer={<Link href="/" className="font-semibold text-[#4f46e5] hover:underline">Return home</Link>}
      >
        <div role="status" className="rounded-lg border border-[#e9e8ff] bg-[#f8f7ff] px-3.5 py-3 text-xs leading-5 text-[#5752a4]">Signed in as {principal.user.email}. This account does not hold the initial administrator claim.</div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="One-time setup"
      title="Initialize program admin"
      description="Register and sign in first, then claim the single administrator account with the secure setup code."
      footer={<Link href="/sign-in" className="font-semibold text-[#4f46e5] hover:underline">Use a different account</Link>}
    >
      <div className="mb-5 rounded-lg border border-[#fff0d6] bg-[#fffaf0] px-3.5 py-3 text-xs leading-5 text-[#8c641d]">This action is available once. Keep the setup code private; administrator access will be tied to your signed-in account.</div>
      <AdminBootstrapForm />
    </AuthShell>
  )
}
