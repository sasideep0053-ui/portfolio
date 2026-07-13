import { useEffect, useState } from 'react'

export function useCountUp(target: number, duration = 1300, start = false) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!start || target === 0) return
    let startTime: number | null = null

    const tick = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [start, target, duration])

  return value
}
