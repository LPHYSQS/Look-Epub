import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { loadTheme, saveTheme, type AppTheme } from '@/storage'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<AppTheme>(loadTheme())

  const isDark = computed(() => theme.value === 'dark')
  const isSepia = computed(() => theme.value === 'sepia')
  const isLight = computed(() => theme.value === 'light')

  function setTheme(newTheme: AppTheme) {
    theme.value = newTheme
    saveTheme(newTheme)
    applyTheme(newTheme)
  }

  function toggleTheme() {
    let newTheme: AppTheme
    if (theme.value === 'light') {
      newTheme = 'dark'
    } else if (theme.value === 'dark') {
      newTheme = 'sepia'
    } else {
      newTheme = 'light'
    }
    setTheme(newTheme)
  }

  function applyTheme(themeValue: AppTheme) {
    document.documentElement.setAttribute('data-theme', themeValue)
  }

  function initTheme() {
    applyTheme(theme.value)
  }

  watch(theme, (newTheme) => {
    applyTheme(newTheme)
  })

  return {
    theme,
    isDark,
    isSepia,
    isLight,
    setTheme,
    toggleTheme,
    initTheme
  }
})
