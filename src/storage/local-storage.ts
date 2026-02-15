import type { ReaderSettings } from '@/types'
import { defaultSettings } from '@/types'

const SETTINGS_KEY = 'look-epub-settings'
const THEME_KEY = 'look-epub-theme'

export type AppTheme = 'light' | 'dark' | 'sepia'

export function loadSettings(): ReaderSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch {
    console.warn('Failed to load settings from localStorage')
  }
  return { ...defaultSettings }
}

export function saveSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    console.warn('Failed to save settings to localStorage')
  }
}

export function loadTheme(): AppTheme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'sepia') {
      return stored
    }
  } catch {
    console.warn('Failed to load theme from localStorage')
  }
  return 'light'
}

export function saveTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    console.warn('Failed to save theme to localStorage')
  }
}
