import { useEffect, useRef } from 'react'
import { useNavActions } from '../contexts/NavigationContext'

export function useNavSection<T extends HTMLElement = HTMLElement>(id: string) {
  const ref = useRef<T>(null)
  const { registerRef } = useNavActions()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    registerRef(id, el)
    return () => registerRef(id, null)
  }, [id, registerRef])

  return ref
}
