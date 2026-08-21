export type AppTheme = 'light' | 'dark'

const STORAGE_KEY = 'vipclub-theme-v2'

function storedTheme(): AppTheme | null {
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === 'dark' || value === 'light' ? value : null
}

export function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111827' : '#f9fafb')
}

export function initializeTheme(): AppTheme {
  const theme = storedTheme() ?? 'light'
  applyTheme(theme)
  return theme
}

export function persistTheme(theme: AppTheme): void {
  window.localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
}
