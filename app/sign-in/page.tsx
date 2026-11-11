import Link from "next/link"
import { AuthShell } from "@/components/upmentor/auth-shell"
import { SignInForm } from "@/components/upmentor/sign-in-form"

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to UpMentor"
      description="Use your enrollment or staff ID, or the email address on your account."
      footer={<>Need an account? <Link href="/sign-up" className="font-semibold text-[#4f46e5] hover:underline">Register as a mentee</Link>. Mentors join by invitation.</>}
    >
      <SignInForm nextPath={params.next} />
    </AuthShell>
  )
}
