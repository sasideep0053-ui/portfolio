import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode; colorTheme?: string }
interface State { error: Error | null }

type ThemeMsg = { title: string; sub: string }

const THEME_MESSAGES: Record<string, ThemeMsg[]> = {
  aot: [
    { title: 'The Wall has been breached.', sub: 'A Titan-sized exception broke through the perimeter. The Survey Corps is investigating.' },
    { title: 'Eren Yeager yeeted this component.', sub: 'The Attack Titan does not respect error boundaries. Or anyone, really.' },
    { title: 'Colossal crash detected.', sub: 'Just like Shiganshina. Everything was fine until it wasn\'t.' },
  ],
  demonslayer: [
    { title: 'Total Concentration Breathing — failed.', sub: 'The demon was too strong this time. Tanjiro will recover and try again.' },
    { title: 'The blade broke before the demon did.', sub: 'Water Breathing cannot fix a null reference. Urokodaki is disappointed.' },
    { title: 'A demon slipped through the render cycle.', sub: 'Muzan coded this exception personally. It targets the weakest components.' },
  ],
  jjk: [
    { title: 'Domain Expansion: Infinite Crash.', sub: 'Gojo would have caught this exception. You are not Gojo.' },
    { title: 'Cursed energy overflow.', sub: 'The binding vow was broken. This component has been exorcised.' },
    { title: 'Malevolent Shrine consumed the state.', sub: 'Sukuna doesn\'t debug. He just destroys everything and starts over.' },
  ],
  blackclover: [
    { title: 'There is no magic to fix this.', sub: 'Even Asta\'s anti-magic cannot negate a JavaScript runtime error.' },
    { title: 'The grimoire has no spell for this.',  sub: 'Page not found in the Book of Bugs. The Wizard King is notified.' },
    { title: 'This is not the power of mana.', sub: 'Yuno\'s spirit abandoned the component tree. Wind magic cannot restart React.' },
  ],
  atla: [
    { title: 'The four elements could not render this.',  sub: 'Even the Avatar State cannot fix an undefined variable. Balance is lost.' },
    { title: 'Aang crashed the air temple.', sub: 'The airbending technique was flawless. The props were not.' },
    { title: 'The spirit world has this component.',  sub: 'It crossed over during a re-render. Iroh suggests tea while you wait.' },
  ],
  hxh: [
    { title: 'Nen has abandoned this component.',  sub: 'The hatsu technique was too complex for the call stack. Netero weeps.' },
    { title: 'The Chimera Ant Arc of errors.', sub: 'An exceptionally long and painful stack trace that could have been avoided.' },
    { title: 'Killua detached from the component tree.',  sub: 'Godspeed was too fast. The reconciler lost track of him entirely.' },
  ],
  default: [
    { title: 'Unlimited Null Works.', sub: "An undefined reference rewrote the call stack. The Throne of Heroes cannot help." },
    { title: 'The cursed technique backfired.', sub: 'Domain expansion collapsed mid-render. An unexpected error broke containment.' },
    { title: 'The recursion held a grudge.', sub: 'It went all the way down. A Silent Stack Overflow.' },
  ],
}

function pickMessage(colorTheme?: string): ThemeMsg {
  const pool = THEME_MESSAGES[colorTheme ?? ''] ?? THEME_MESSAGES.default
  return pool[Math.floor(Math.random() * pool.length)]
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  retry = () => this.setState({ error: null })

  goHome = () => {
    // Navigate to home and clear the error — different from retry (which stays on same route)
    window.history.pushState({}, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    setTimeout(() => this.setState({ error: null }), 50)
  }

  render() {
    if (this.state.error) {
      const { title, sub } = pickMessage(this.props.colorTheme)
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 800,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            background: 'var(--surface, #111)',
            border: '1px solid var(--border-mid, rgba(255,255,255,0.14))',
            borderRadius: '1rem',
            padding: '2.5rem 2rem',
            maxWidth: '26rem', width: '100%',
            textAlign: 'center',
            boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
            fontFamily: 'var(--font, Inter, sans-serif)',
            color: 'var(--text, #f5f5f7)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem',
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
              {title}
            </h2>

            <p style={{ margin: 0, opacity: 0.55, fontSize: '0.875rem', lineHeight: 1.6 }}>
              {sub}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button onClick={this.goHome} style={{
                padding: '0.5rem 1.25rem', borderRadius: '0.5rem',
                border: '1px solid var(--border-mid, rgba(255,255,255,0.14))',
                background: 'transparent', color: 'var(--text, #f5f5f7)',
                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                fontFamily: 'var(--font, inherit)',
              }}>← Go Home</button>
              <button onClick={this.retry} style={{
                padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none',
                background: 'var(--accent, #0a84ff)', color: '#fff',
                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                fontFamily: 'var(--font, inherit)',
              }}>Retry</button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
