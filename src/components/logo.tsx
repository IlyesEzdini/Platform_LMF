import logo from '../assets/logo.jpg'

// mix-blend-multiply makes the JPEG's white background blend into the page.
export default function Logo({ className = 'h-14' }: { className?: string }) {
  return <img src={logo} alt="Club Ambassadeurs VESOS TN | LMF Sfax" className={`w-auto mix-blend-multiply ${className}`} />
}
