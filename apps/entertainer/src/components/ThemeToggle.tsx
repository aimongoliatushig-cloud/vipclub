import { useState } from 'react'
import { initializeTheme, persistTheme, type ThemePreference } from '../themeRuntime'

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>(initializeTheme)

  return (
    <select
      className="theme-toggle"
      aria-label="Дэлгэцийн горим"
      title="Дэлгэцийн горим"
      value={preference}
      onChange={event => {
        const nextPreference = event.target.value as ThemePreference
        persistTheme(nextPreference)
        setPreference(nextPreference)
      }}
    >
      <option value="system">Систем</option>
      <option value="light">Цайвар</option>
      <option value="dark">Бараан</option>
    </select>
  )
}
