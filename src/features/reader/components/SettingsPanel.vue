<script setup lang="ts">
import { watch, ref, onMounted } from 'vue'
import type { ReaderSettings } from '@/types'
import { useThemeStore } from '@/stores'
import { getSystemFonts } from '@/utils/fonts'

defineProps<{
  settings: ReaderSettings
}>()

const emit = defineEmits<{
  update: [settings: Partial<ReaderSettings>]
  close: []
}>()

const themeStore = useThemeStore()
const fontFamilies = ref<{ value: string; label: string }[]>([])
const customFontName = ref('')

onMounted(async () => {
  fontFamilies.value = await getSystemFonts()
  const savedCustomFonts = localStorage.getItem('custom-fonts')
  if (savedCustomFonts) {
    const customs = JSON.parse(savedCustomFonts)
    fontFamilies.value = [...fontFamilies.value, ...customs]
  }
})

const isUpdating = ref(false)

const themes = [
  { value: 'light', label: '明亮', color: '#ffffff', textColor: '#333333' },
  { value: 'dark', label: '暗黑', color: '#1a1a1a', textColor: '#ffffff' },
  { value: 'sepia', label: '护眼', color: '#f4ecd8', textColor: '#3d3426' }
]

const fontSizes = [14, 16, 18, 20, 22, 24]

function addCustomFont() {
  const fontName = customFontName.value.trim()
  if (!fontName) return
  
  const exists = fontFamilies.value.some(f => f.value.toLowerCase() === fontName.toLowerCase())
  if (!exists) {
    const newFont = { value: fontName, label: fontName }
    fontFamilies.value.push(newFont)
    
    const savedCustomFonts = localStorage.getItem('custom-fonts')
    const customs = savedCustomFonts ? JSON.parse(savedCustomFonts) : []
    customs.push(newFont)
    localStorage.setItem('custom-fonts', JSON.stringify(customs))
  }
  
  emit('update', { fontFamily: fontName })
  customFontName.value = ''
}

function handleThemeChange(theme: ReaderSettings['theme']) {
  isUpdating.value = true
  emit('update', { theme })
  themeStore.setTheme(theme)
  setTimeout(() => { isUpdating.value = false }, 0)
}

watch(() => themeStore.theme, (newTheme) => {
  if (!isUpdating.value) {
    emit('update', { theme: newTheme })
  }
})
</script>

<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h2>阅读设置</h2>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>

    <div class="settings-content">
      <div class="setting-group">
        <label>主题</label>
        <div class="theme-options">
          <button
            v-for="theme in themes"
            :key="theme.value"
            class="theme-btn"
            :class="{ active: settings.theme === theme.value }"
            :style="{ backgroundColor: theme.color, color: theme.textColor }"
            @click="handleThemeChange(theme.value as ReaderSettings['theme'])"
          >
            {{ theme.label }}
          </button>
        </div>
      </div>

      <div class="setting-group">
        <label>字号: {{ settings.fontSize }}px</label>
        <div class="size-options">
          <button
            v-for="size in fontSizes"
            :key="size"
            class="size-btn"
            :class="{ active: settings.fontSize === size }"
            @click="emit('update', { fontSize: size })"
          >
            {{ size }}
          </button>
        </div>
      </div>

      <div class="setting-group">
        <label>行高: {{ settings.lineHeight }}</label>
        <input
          type="range"
          min="1.4"
          max="2.2"
          step="0.2"
          :value="settings.lineHeight"
          @input="emit('update', { lineHeight: parseFloat(($event.target as HTMLInputElement).value) })"
          class="slider"
        />
      </div>

      <div class="setting-group">
        <label>字体</label>
        <select
          class="font-select"
          :value="settings.fontFamily"
          @change="emit('update', { fontFamily: ($event.target as HTMLSelectElement).value })"
        >
          <option
            v-for="font in fontFamilies"
            :key="font.value"
            :value="font.value"
            :style="{ fontFamily: font.value }"
          >
            {{ font.label }}
          </option>
        </select>
        <div class="custom-font-input">
          <input
            type="text"
            v-model="customFontName"
            placeholder="输入自定义字体名称"
            @keyup.enter="addCustomFont"
          />
          <button @click="addCustomFont" class="add-font-btn">添加</button>
        </div>
      </div>

      <div class="setting-group">
        <label>页面宽度: {{ settings.pageWidth }}px</label>
        <input
          type="range"
          min="600"
          max="1200"
          step="100"
          :value="settings.pageWidth"
          @input="emit('update', { pageWidth: parseInt(($event.target as HTMLInputElement).value) })"
          class="slider"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  background: #fff;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 200;
  display: flex;
  flex-direction: column;
}

[data-theme="dark"] .settings-panel {
  background: #1a1a2e;
}

[data-theme="dark"] .settings-header {
  border-bottom-color: #333;
}

[data-theme="dark"] .settings-header h2 {
  color: #e0e0e0;
}

[data-theme="dark"] .close-btn {
  color: #aaa;
}

[data-theme="dark"] .setting-group label {
  color: #e0e0e0;
}

[data-theme="dark"] .setting-group {
  border-bottom-color: #333;
}

[data-theme="dark"] .size-btn,
[data-theme="dark"] .font-btn {
  color: #aaa;
  border-color: #444;
}

[data-theme="dark"] .size-btn:hover,
[data-theme="dark"] .font-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .size-btn.active,
[data-theme="dark"] .font-btn.active {
  background: #4a90d9;
  color: #fff;
  border-color: #4a90d9;
}

[data-theme="dark"] .slider {
  background: #333;
}

[data-theme="dark"] .theme-btn {
  color: #aaa;
  border-color: #444;
}

[data-theme="dark"] .theme-btn:hover {
  border-color: #666;
}

[data-theme="dark"] .theme-btn.active {
  border-color: #4a90d9;
}

.theme-sepia .settings-panel {
  background: #f4ecd8;
}

.theme-sepia .settings-header {
  border-bottom-color: #d4c9a8;
}

.theme-sepia .settings-header h2 {
  color: #3d3426;
}

.theme-sepia .close-btn {
  color: #5c5340;
}

.theme-sepia .setting-group label {
  color: #3d3426;
}

.theme-sepia .setting-group {
  border-bottom-color: #d4c9a8;
}

.theme-sepia .size-btn,
.theme-sepia .font-btn {
  color: #5c5340;
  border-color: #d4c9a8;
}

.theme-sepia .size-btn:hover,
.theme-sepia .font-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.theme-sepia .size-btn.active,
.theme-sepia .font-btn.active {
  background: #8b7355;
  color: #fff;
  border-color: #8b7355;
}

.theme-sepia .slider {
  background: #d4c9a8;
}

.theme-sepia .theme-btn {
  color: #5c5340;
  border-color: #d4c9a8;
}

.theme-sepia .theme-btn:hover {
  border-color: #8b7355;
}

.theme-sepia .theme-btn.active {
  border-color: #8b7355;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.settings-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  color: #333;
}

.theme-options {
  display: flex;
  gap: 10px;
}

.theme-btn {
  flex: 1;
  padding: 15px;
  border: 2px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  transition: all 0.2s;
}

.theme-btn:hover {
  border-color: #ccc;
}

.theme-btn.active {
  border-color: #4a90d9;
}

.size-options {
  display: flex;
  gap: 5px;
}

.size-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  border-radius: 4px;
  transition: all 0.2s;
}

.size-btn:hover {
  border-color: #4a90d9;
}

.size-btn.active {
  background: #4a90d9;
  color: #fff;
  border-color: #4a90d9;
}

.font-options {
  display: flex;
  gap: 10px;
}

.font-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  border-radius: 4px;
  transition: all 0.2s;
}

.font-btn:hover {
  border-color: #4a90d9;
}

.font-btn.active {
  background: #4a90d9;
  color: #fff;
  border-color: #4a90d9;
}

.font-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

[data-theme="dark"] .font-select {
  background: #2a2a3e;
  border-color: #444;
  color: #ddd;
}

.theme-sepia .font-select {
  background: #f4ecd8;
  border-color: #d4c9a8;
  color: #5c5340;
}

.custom-font-input {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.custom-font-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

[data-theme="dark"] .custom-font-input input {
  background: #2a2a3e;
  border-color: #444;
  color: #ddd;
}

.theme-sepia .custom-font-input input {
  background: #f4ecd8;
  border-color: #d4c9a8;
  color: #5c5340;
}

.add-font-btn {
  padding: 8px 16px;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.add-font-btn:hover {
  background: #3a7bc8;
}

[data-theme="dark"] .add-font-btn {
  background: #4a90d9;
}

.theme-sepia .add-font-btn {
  background: #8b7355;
}

.theme-sepia .add-font-btn:hover {
  background: #7a6448;
}

.slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #eee;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4a90d9;
  cursor: pointer;
}
</style>
