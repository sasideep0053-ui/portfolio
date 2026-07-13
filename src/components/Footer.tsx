import { RESUME } from '../data/resume'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p className="footer__copy">© {new Date().getFullYear()} {RESUME.name}</p>
        <p className="footer__meta">
          60+ FPS canvas rendering · SVG-based animations · 7 runtime-swappable themes · React + Vite
        </p>
      </div>
    </footer>
  )
}
