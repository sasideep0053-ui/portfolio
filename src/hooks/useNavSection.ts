import { useEffect, useRef } from 'react'
import { useNavigation } from '../contexts/NavigationContext'

export function useNavSection<T extends HTMLElement = HTMLElement>(id: string) {
  const ref = useRef<T>(null)
  const { registerRef } = useNavigation()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    registerRef(id, el)
    return () => registerRef(id, null)
  }, [id, registerRef])

  return ref
}
