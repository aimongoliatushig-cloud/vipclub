export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

/** @deprecated Use ResolvedTheme for the applied theme and ThemePreference for the user's choice. */
export type AppTheme = ResolvedTheme

export const THEME_STORAGE_KEY = 'vipclub-theme-v3'
export const LEGACY_THEME_STORAGE_KEY = 'vipclub-theme-v2'

let removeSystemListener: (() => void) | undefined

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isResolvedTheme(value: string | null): value is ResolvedTheme {
  return value === 'light' || value === 'dark'
}

function storage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function storedPreference(): ThemePreference {
  const localStorage = storage()
  if (!localStorage) return 'light'

  try {
    const savedPreference = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemePreference(savedPreference)) return savedPreference

    const legacyTheme = localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
    if (isResolvedTheme(legacyTheme)) {
      localStorage.setItem(THEME_STORAGE_KEY, legacyTheme)
      return legacyTheme
    }
  } catch {
    // Theme selection is a convenience; rendering must still work when storage is unavailable.
  }

  return 'light'
}

function getSystemMediaQuery(): MediaQueryList | undefined {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
  return window.matchMedia('(prefers-color-scheme: dark)')
}

export function resolveTheme(preference: ThemePreference, prefersDark = getSystemMediaQuery()?.matches ?? false): ResolvedTheme {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0D1117' : '#F4F6F8')
}

function stopSystemListener(): void {
  removeSystemListener?.()
  removeSystemListener = undefined
}

function startSystemListener(): void {
  stopSystemListener()
  const mediaQuery = getSystemMediaQuery()
  if (!mediaQuery) return

  const handleChange = (event: MediaQueryListEvent) => applyTheme(event.matches ? 'dark' : 'light')
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange)
    removeSystemListener = () => mediaQuery.removeEventListener('change', handleChange)
  } else {
    mediaQuery.addListener(handleChange)
    removeSystemListener = () => mediaQuery.removeListener(handleChange)
  }
}

export function initializeTheme(): ThemePreference {
  const preference = storedPreference()
  applyTheme(resolveTheme(preference))
  if (preference === 'system') startSystemListener()
  else stopSystemListener()
  return preference
}

export function persistTheme(preference: ThemePreference): ResolvedTheme {
  const localStorage = storage()
  try {
    localStorage?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Keep the chosen theme for the current page even when persistence is blocked.
  }

  const theme = resolveTheme(preference)
  applyTheme(theme)
  if (preference === 'system') startSystemListener()
  else stopSystemListener()
  return theme
}

/** Releases the active system-preference listener. Useful for runtime teardown and focused tests. */
export function disposeThemeRuntime(): void {
  stopSystemListener()
}
