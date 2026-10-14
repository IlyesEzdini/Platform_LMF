import { ChevronRight, Lightbulb, Mail, type LucideIcon } from 'lucide-react'
import hero from '../assets/home-hero.webp'
import type { Kind } from '../types'

// Each button sits on one pill of the image. Adjust left / top / width / height (in %) if it is slightly off.
// `top` is the vertical CENTER of the button.
const ZONES: { kind: Kind; label: string; short: string; Icon: LucideIcon; style: React.CSSProperties }[] = [
  { kind: 'idea', label: 'Share an idea', short: 'Idea', Icon: Lightbulb, style: { left: '5.5%', top: '55.9%', width: '30.5%', height: '22%' } },
  { kind: 'complaint', label: 'Complaint', short: 'Complaint', Icon: Mail, style: { left: '63.4%', top: '56.6%', width: '31%', height: '22%' } },
]

export default function Home({ username, onPick }: { username: string; onPick: (k: Kind) => void }) {
  return (
    <div>
      <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight sm:text-3xl">Hi {username} 👋</h1>
      <p className="mb-4 text-center text-sm text-ink-500">What would you like to do?</p>

      <div className="relative mx-auto w-full max-w-5xl">
        <img src={hero} alt="" draggable={false} className="pointer-events-none h-auto w-full select-none mix-blend-multiply" />
        {ZONES.map(({ kind, label, short, Icon, style }) => (
          <button key={kind} onClick={() => onPick(kind)} aria-label={label}
            style={{ ...style, transform: 'translateY(-50%)', minHeight: 44, fontSize: 'clamp(10px, 2.1vw, 22px)' }}
            className="absolute flex items-center justify-center gap-[0.5em] rounded-full font-semibold text-ink-900 transition hover:bg-white/50 hover:ring-2 hover:ring-brand-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
            <Icon className="h-[1.25em] w-[1.25em] text-brand-600" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{short}</span>
            <ChevronRight className="hidden h-[1.25em] w-[1.25em] text-brand-600 sm:block" />
          </button>
        ))}
      </div>
    </div>
  )
}