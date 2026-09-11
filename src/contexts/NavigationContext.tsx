import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react'

interface NavActions {
  setActive:   (id: string) => void
  registerRef: (id: string, el: HTMLElement | null) => void
  scrollTo:    (id: string) => void
}

// Split into two contexts so that section components only registering a ref
// (About, Skills, EngineeringLab, Contact via useNavSection) don't re-render
// on every scroll tick — only ScrollNav actually needs the live activeId.
const ActionsCtx = createContext<NavActions>({
  setActive: () => {}, registerRef: () => {}, scrollTo: () => {},
})
const ActiveCtx = createContext('')

export function NavigationProvider({ children }: { children: ReactNode }) {
  const refs = useRef(new Map<string, HTMLElement>())
  const [activeId,   setActiveId]   = useState('')
  const [refVersion, setRefVersion] = useState(0)

  const detect = useCallback(() => {
    if (refs.current.size === 0) { setActiveId(''); return }

    const scrollBottom = window.scrollY + window.innerHeight
    const pageHeight   = document.documentElement.scrollHeight

    if (scrollBottom >= pageHeight - 80) {
      let last = '', lastTop = -Infinity
      for (const [id, el] of refs.current.entries()) {
        const top = el.getBoundingClientRect().top + window.scrollY
        if (top > lastTop) { lastTop = top; last = id }
      }
      if (last) setActiveId(last)
      return
    }

    const threshold = window.scrollY + window.innerHeight * 0.4
    let best = '', bestTop = -Infinity
    let first = '', firstTop = Infinity
    for (const [id, el] of refs.current.entries()) {
      const top = el.getBoundingClientRect().top + window.scrollY
      if (top <= threshold && top > bestTop) { bestTop = top; best = id }
      if (top < firstTop) { firstTop = top; first = id }
    }
    // Before any section crosses the threshold (e.g. still viewing the hero), default to the first section.
    setActiveId(best || first)
  }, [])

  // Scroll listener
  useEffect(() => {
    window.addEventListener('scroll', detect, { passive: true })
    detect()
    return () => window.removeEventListener('scroll', detect)
  }, [detect])

  // Re-detect when sections mount/unmount (e.g. navigating back to home from lab).
  // Small timeout lets the browser apply the scroll-to-top before we sample positions.
  useEffect(() => {
    const t = window.setTimeout(detect, 60)
    return () => clearTimeout(t)
  }, [refVersion, detect])

  const setActive   = useCallback((id: string) => setActiveId(id), [])
  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) refs.current.set(id, el)
    else    refs.current.delete(id)
    setRefVersion(v => v + 1)
  }, [])
  const scrollTo = useCallback((id: string) => {
    refs.current.get(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // setActive/registerRef/scrollTo are all stable (useCallback, empty deps),
  // so this object's identity never changes across re-renders — consumers of
  // just the actions never re-render when activeId changes.
  const actions = useMemo(() => ({ setActive, registerRef, scrollTo }), [setActive, registerRef, scrollTo])

  return (
    <ActionsCtx.Provider value={actions}>
      <ActiveCtx.Provider value={activeId}>
        {children}
      </ActiveCtx.Provider>
    </ActionsCtx.Provider>
  )
}

export const useNavActions    = () => useContext(ActionsCtx)
export const useActiveSection = () => useContext(ActiveCtx)
