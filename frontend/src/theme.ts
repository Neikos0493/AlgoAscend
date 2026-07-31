export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'algoascend_theme'
export const DEFAULT_THEME: Theme = 'dark'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(stored)) return stored
  } catch { /* ignore */ }
  return DEFAULT_THEME
}

let transitionTimer: number | undefined

export function applyTheme(theme: Theme, animate = false) {
  const root = document.documentElement

  if (animate && root.dataset.theme !== theme) {
    window.clearTimeout(transitionTimer)
    root.classList.add('theme-transitioning')
    transitionTimer = window.setTimeout(() => {
      root.classList.remove('theme-transitioning')
    }, 420)
  }

  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export function persistTheme(theme: Theme) {
  try { localStorage.setItem(THEME_STORAGE_KEY, theme) } catch { /* ignore */ }
}

export function initializeTheme(): Theme {
  const rootTheme = document.documentElement.dataset.theme
  const theme = isTheme(rootTheme) ? rootTheme : readStoredTheme()
  applyTheme(theme)
  return theme
}
