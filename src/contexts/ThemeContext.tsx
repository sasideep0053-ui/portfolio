import { createContext, useContext, useState, type ReactNode } from 'react'
import { devLog } from '../lib/devLog'

export type Theme     = 'dark' | 'light'
export type FontSize  = 'normal' | 'large' | 'xlarge'
export type ColorTheme = 'blue' | 'aot' | 'blackclover' | 'demonslayer' | 'jjk' | 'atla' | 'hxh'

export const COLOR_THEMES: Record<ColorTheme, { name: string; tag: string; accent: string }> = {
  // cool / calm
  blue:        { name: 'Galactic Core',   tag: '[ 3... 2... 1... Let\'s Jam ]', accent: '#0a84ff' },
  atla:        { name: 'Master of Four',  tag: '[ Avatar State: Engaged ]',   accent: '#38bdf8' },
  // energetic
  hxh:         { name: 'Nen Protocol',    tag: '[ Hunter\'s Exam: Cleared ]',  accent: '#16a34a' },
  blackclover: { name: 'Grimoire Noir',   tag: '[ Five-Leaf Clover ]',        accent: '#f59e0b' },
  // intense
  jjk:         { name: 'Hollow Purple',   tag: '[ Domain Expansion ]',        accent: '#818cf8' },
  demonslayer: { name: 'Hashira Rising',  tag: '[ Demon Slayer Corps ]',      accent: '#db2777' },
  aot:         { name: 'Crimson Survey',  tag: '[ Scout Regiment Oath ]',     accent: '#dc2626' },
}

interface ThemeCtx {
  theme:       Theme
  colorTheme:  ColorTheme
  fontSize:    FontSize
  toggleTheme: () => void
  setColorTheme: (c: ColorTheme) => void
  setFontSize: (s: FontSize) => void
}

const Ctx = createContext<ThemeCtx>(null!)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'dark',
  )
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem('colorTheme') as ColorTheme
    return stored && stored in COLOR_THEMES ? stored : 'blue'
  })
  const [fontSize, setFontSizeState] = useState<FontSize>(
    () => (localStorage.getItem('fontSize') as FontSize) ?? 'normal',
  )

  const toggleTheme = () =>
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return next
    })

  const setColorTheme = (c: ColorTheme) => {
    setColorThemeState(c)
    localStorage.setItem('colorTheme', c)
    devLog('THEME', `switching → ${COLOR_THEMES[c].name}`)
  }

  const setFontSize = (s: FontSize) => {
    setFontSizeState(s)
    localStorage.setItem('fontSize', s)
  }

  // data-theme, data-color, data-font are all React-managed attributes on the wrapper div
  return (
    <Ctx.Provider value={{ theme, colorTheme, fontSize, toggleTheme, setColorTheme, setFontSize }}>
      <div data-theme={theme} data-color={colorTheme} data-font={fontSize} className="theme-root">
        {children}
      </div>
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
