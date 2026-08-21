import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { initializeTheme, persistTheme, type AppTheme } from '../themeRuntime'

export function ThemeToggle() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    const current = document.documentElement.dataset.theme
    return current === 'dark' || current === 'light' ? current : initializeTheme()
  })

  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const label = nextTheme === 'dark' ? 'Харанхуй горим асаах' : 'Харанхуй горим унтраах'

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      aria-pressed={theme === 'dark'}
      title={label}
      onClick={() => {
        persistTheme(nextTheme)
        setTheme(nextTheme)
      }}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      <span>{theme === 'dark' ? 'Унтраах' : 'Асаах'}</span>
    </button>
  )
}
