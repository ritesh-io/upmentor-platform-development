import Link from "next/link"
import { AuthShell } from "@/components/upmentor/auth-shell"
import { SignUpForm } from "@/components/upmentor/sign-up-form"
import { getMentorInviteDetails } from "@/lib/auth-roles"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[] }>
}) {
  const params = await searchParams
  const inviteToken = typeof params.invite === "string" ? params.invite : undefined
  const invitation = inviteToken ? await getMentorInviteDetails(inviteToken) : null

  return (
    <AuthShell
      eyebrow={inviteToken ? "Mentor invitation" : "Get started"}
      title={inviteToken ? "Join as a mentor" : "Create your account"}
      description={inviteToken
        ? "Complete your account with the one-time invitation from your program administrator."
        : "Create a mentee account with your enrollment number and a secure password."}
      footer={<>Already registered? <Link href="/sign-in" className="font-semibold text-[#4f46e5] hover:underline">Sign in</Link>. Program administrators can initialize access after signing in.</>}
    >
      <SignUpForm
        mentorInviteToken={invitation ? inviteToken : undefined}
        invitedEmail={invitation?.invitedEmail}
        invalidInvite={Boolean(inviteToken && !invitation)}
      />
    </AuthShell>
  )
}
