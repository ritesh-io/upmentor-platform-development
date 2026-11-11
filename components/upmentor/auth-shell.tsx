import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Brand } from "@/components/upmentor/brand"

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col bg-[#f7f8fc] text-[#172033]">
      <header className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <Brand />
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-[#737c8e] transition hover:text-[#4f46e5]">
          <ArrowLeft size={14} /> Back to home
        </Link>
      </header>
      <section className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-5 pb-14 pt-6 sm:px-8">
        <div className="rounded-2xl border border-[#e6e8ef] bg-white p-6 shadow-[0_18px_60px_-36px_rgba(23,32,51,.24)] sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#5a52e8]">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#778094]">{description}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 border-t border-[#eff0f5] pt-5 text-center text-xs leading-5 text-[#778094]">{footer}</div>}
        </div>
      </section>
    </main>
  )
}
