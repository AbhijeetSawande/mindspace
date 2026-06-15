import { useState, useEffect, createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'

export type Page =
  | 'dashboard' | 'myday'
  | 'todos' | 'notes' | 'projects' | 'calendar'
  | 'habits' | 'goals' | 'journal' | 'health' | 'finance'
  | 'learn' | 'vocab' | 'news' | 'tolearn' | 'books' | 'links' | 'language'
  | 'edge' | 'focus' | 'ai' | 'settings'

interface AppState {
  theme: Theme
  page: Page
  sidebarCollapsed: boolean
  setTheme: (t: Theme) => void
  setPage: (p: Page) => void
  setSidebarCollapsed: (v: boolean) => void
}

export const AppContext = createContext<AppState>({
  theme: 'dark',
  page: 'dashboard',
  sidebarCollapsed: false,
  setTheme: () => {},
  setPage: () => {},
  setSidebarCollapsed: () => {},
})

export function useApp() {
  return useContext(AppContext)
}

export function useAppState(): AppState {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('cortex-theme')
    return (saved === 'dark' || saved === 'light') ? saved : 'dark'
  })
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('cortex-theme', t)
  }

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  // Apply on first mount
  useEffect(() => {
    const saved = (localStorage.getItem('cortex-theme') as Theme) || 'dark'
    if (saved !== 'dark') {
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  return { theme, page, sidebarCollapsed, setTheme, setPage, setSidebarCollapsed }
}
