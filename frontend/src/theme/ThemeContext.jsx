import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext({ isLight: false, toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [isLight, setIsLight] = useState(() => {
    const saved = localStorage.getItem('fm_theme')
    return saved ? saved === 'light' : false
  })

  useEffect(() => {
    localStorage.setItem('fm_theme', isLight ? 'light' : 'dark')
  }, [isLight])

  const value = useMemo(() => ({ isLight, toggleTheme: () => setIsLight(v => !v) }), [isLight])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}


