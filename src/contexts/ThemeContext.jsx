import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('irtiwaa-theme') ?? 'light'
  )
  const [sidebarMode, setSidebarMode] = useState(() =>
    localStorage.getItem('irtiwaa-sidebar-mode') === 'expanded' ? 'expanded' : 'compact'
  )

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    localStorage.setItem('irtiwaa-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('irtiwaa-sidebar-mode', sidebarMode)
  }, [sidebarMode])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const toggleSidebarMode = () => setSidebarMode(mode => mode === 'expanded' ? 'compact' : 'expanded')

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle,
        isDark: theme === 'dark',
        sidebarMode,
        setSidebarMode,
        toggleSidebarMode,
        isSidebarExpanded: sidebarMode === 'expanded',
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
