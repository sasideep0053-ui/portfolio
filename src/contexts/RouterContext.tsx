import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface RouterCtx {
  path: string
  navigate: (to: string) => void
}

const Ctx = createContext<RouterCtx>({ path: '/', navigate: () => {} })

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname + window.location.search)

  useEffect(() => {
    const handler = () => setPath(window.location.pathname + window.location.search)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const navigate = useCallback((to: string) => {
    window.history.pushState(null, '', to)
    setPath(to)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return <Ctx.Provider value={{ path, navigate }}>{children}</Ctx.Provider>
}

export const useRouter = () => useContext(Ctx)
