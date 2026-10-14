import { Lightbulb, Mail } from 'lucide-react'
import hero from '/assets/friend.png'
import type { Kind } from '../types'

// To change the background image, replace src/assets/home-hero.webp (or change the import above).
// The two clickable zones sit exactly on the two pill buttons drawn in the image (percentages of the image).
const ZONES: { kind: Kind; label: string; style: React.CSSProperties }[] = [
  { kind: 'idea', label: 'Share an idea', style: { left: '6.6%', top: '47.3%', width: '30.7%', height: '18.6%' } },
  { kind: 'complaint', label: 'Share a complaint', style: { left: '63%', top: '48.5%', width: '29.7%', height: '18.6%' } },
]

export default function Home({ username, onPick }: { username: string; onPick: (k: Kind) => void }) {
  return (
    <div>
      <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight sm:text-3xl">Hi {username} 👋</h1>
      <p className="mb-4 text-center text-sm text-ink-500">What would you like to do?</p>

      <div className="relative mx-auto w-full max-w-5xl">
        <img src={hero} alt="" draggable={false} className="pointer-events-none h-auto w-full select-none mix-blend-multiply" />
        {ZONES.map((z) => (
          <button key={z.kind} onClick={() => onPick(z.kind)} aria-label={z.label} title={z.label} style={z.style}
            className="absolute rounded-full transition hover:bg-white/30 hover:ring-2 hover:ring-brand-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600" />
        ))}
      </div>

      {/* Mobile: the image is small, so show real buttons as well */}
      <div className="mt-4 grid gap-3 sm:hidden">
        <button className="btn py-3" onClick={() => onPick('idea')}><Lightbulb size={18} /> Share an idea</button>
        <button className="btn py-3" onClick={() => onPick('complaint')}><Mail size={18} /> Complaint</button>
      </div>
    </div>
  )
}
