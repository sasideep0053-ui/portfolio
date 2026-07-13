import { createContext, useContext, type ReactNode } from 'react'
import { t } from '../data/i18n'

interface LocaleCtx {
  strings: typeof t['en']
}

const Ctx = createContext<LocaleCtx>({ strings: t['en'] })

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Always English — remove any previously-saved locale from storage
  if (typeof localStorage !== 'undefined') localStorage.removeItem('locale')

  return (
    <Ctx.Provider value={{ strings: t['en'] }}>
      {children}
    </Ctx.Provider>
  )
}

export const useLocale = () => useContext(Ctx)
