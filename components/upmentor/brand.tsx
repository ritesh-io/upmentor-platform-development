import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${inverse ? "text-white" : "text-[#172033]"}`}><span className="grid size-8 place-items-center rounded-xl bg-[#4f46e5] text-white"><Sparkles size={17} /></span><span>upmentor<span className="text-[#4f46e5]">.</span></span></Link>
}

export function AppLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-2 rounded-lg bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338ca]">{children}<ArrowRight size={16} /></Link>
}
