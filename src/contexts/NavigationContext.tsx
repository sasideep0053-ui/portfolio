import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'

interface NavCtx {
  activeId:    string
  setActive:   (id: string) => void
  registerRef: (id: string, el: HTMLElement | null) => void
  scrollTo:    (id: string) => void
}

const Ctx = createContext<NavCtx>({
  activeId: '', setActive: () => {}, registerRef: () => {}, scrollTo: () => {},
})

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
    for (const [id, el] of refs.current.entries()) {
      const top = el.getBoundingClientRect().top + window.scrollY
      if (top <= threshold && top > bestTop) { bestTop = top; best = id }
    }
    if (best) setActiveId(best)
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

  return (
    <Ctx.Provider value={{ activeId, setActive, registerRef, scrollTo }}>
      {children}
    </Ctx.Provider>
  )
}

export const useNavigation = () => useContext(Ctx)
