import { useEffect, useState } from 'react'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { LocaleProvider } from './contexts/LocaleContext'
import { NavigationProvider } from './contexts/NavigationContext'
import { RouterProvider, useRouter } from './contexts/RouterContext'
import { ConsoleProvider } from './contexts/ConsoleContext'
import { useLocale } from './contexts/LocaleContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import ScrollNav from './components/ScrollNav'
import Hero from './components/Hero'
import About from './components/About'
import Skills from './components/Skills'
import EngineeringLab from './components/EngineeringLab'
import Contact from './components/Contact'
import Footer from './components/Footer'
import StarField from './components/StarField'
import ThemeBackground from './components/ThemeBackground'
import LabPage from './components/LabPage'
import ComponentsPage from './components/ComponentsPage'
import ChatBubble from './components/ChatBubble'

const CUSTOM_BG_THEMES = new Set(['aot', 'blackclover', 'demonslayer', 'jjk', 'atla', 'hxh'])

function SkipLink() {
  const { strings } = useLocale()
  return (
    <a href="#main-content" className="skip-link">
      {strings.skipLink}
    </a>
  )
}

function AppRoutes() {
  const { path } = useRouter()
  const { colorTheme } = useTheme()
  const showCustomBg = CUSTOM_BG_THEMES.has(colorTheme)

  useEffect(() => {
    const base = 'Sasideep Kakumani'
    const params = path.includes('?') ? new URLSearchParams(path.slice(path.indexOf('?'))) : null
    if (path.startsWith('/lab')) {
      const seg = path.replace('/lab', '').split('?')[0].replace(/^\//, '')
      const titles: Record<string, string> = {
        'drive-score': 'Drive Score Simulator',
        speech: 'Speech Visualizer',
        drone: 'Drone PID Controller',
        galton: 'Galton Board',
      }
      document.title = seg && titles[seg] ? `${titles[seg]} — Lab — ${base}` : `Engineering Lab — ${base}`
    } else if (path.startsWith('/components')) {
      const tab  = params?.get('tab')
      const demo = params?.get('demo')
      const tabTitles: Record<string, string> = {
        charts: 'Bar & Line Charts', drilldown: 'Drill-Down Chart',
        pivot: 'Pivot Table',        donut: 'Donut Chart',
      }
      document.title = tab && tabTitles[tab]
        ? `${tabTitles[tab]} — UI Toolkit — ${base}`
        : demo === 'dashboard'
          ? `Dashboard Builder — UI Toolkit — ${base}`
          : `UI Toolkit — ${base}`
    } else {
      document.title = `${base} — Frontend Engineer, AI & Real-Time Systems`
    }
  }, [path])

  const bg = showCustomBg ? <ThemeBackground /> : <StarField />

  if (path.startsWith('/lab')) {
    return (
      <>
        {bg}
        <Navbar />
        <ErrorBoundary colorTheme={colorTheme}>
          <LabPage />
          {import.meta.env.DEV && <DevErrorContent />}
        </ErrorBoundary>
      </>
    )
  }

  if (path.startsWith('/components')) {
    return (
      <>
        {bg}
        <Navbar />
        <ErrorBoundary colorTheme={colorTheme}>
          <ComponentsPage />
          {import.meta.env.DEV && <DevErrorContent />}
        </ErrorBoundary>
      </>
    )
  }

  return (
    <>
      {bg}
      <SkipLink />
      <Navbar />
      <ScrollNav />
      <ErrorBoundary colorTheme={colorTheme}>
        <main id="main-content" tabIndex={-1} className="main-content">
          <Hero />
          <About />
          <Skills />
          <EngineeringLab />
          <Contact />
        </main>
        <Footer />
        {import.meta.env.DEV && <DevErrorContent />}
      </ErrorBoundary>
    </>
  )
}

export default function App() {
  return (
    <RouterProvider>
      <ThemeProvider>
        <LocaleProvider>
          <NavigationProvider>
            <ConsoleProvider>
              <AppRoutes />
              {import.meta.env.DEV && (
                <ErrorBoundary colorTheme="default">
                  <ChatBubble />
                </ErrorBoundary>
              )}
            </ConsoleProvider>
          </NavigationProvider>
        </LocaleProvider>
      </ThemeProvider>
    </RouterProvider>
  )
}

function DevErrorContent() {
  const [boom, setBoom] = useState(false)
  useEffect(() => {
    const handler = () => setBoom(true)
    window.addEventListener('dev:error', handler)
    return () => window.removeEventListener('dev:error', handler)
  }, [])
  if (boom) throw new Error('Dev error trigger — testing ErrorBoundary')
  return null
}
