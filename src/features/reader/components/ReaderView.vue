<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useReaderStore, useThemeStore } from '@/stores'
import { ContentRenderer } from '@/core/renderer'
import type { EpubTocItem } from '@/types'
import Toolbar from './Toolbar.vue'
import TocPanel from './TocPanel.vue'
import SettingsPanel from './SettingsPanel.vue'

const readerStore = useReaderStore()
const themeStore = useThemeStore()

const frontendStatus = ref<'running' | 'stopped' | 'checking'>('checking')

const contentRef = ref<HTMLElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)
const showToc = ref(false)
const showSettings = ref(false)
const isToolbarVisible = ref(false)

const readerTheme = computed({
  get: () => readerStore.settings.theme,
  set: (value) => readerStore.updateSettings({ theme: value })
})

watch(() => themeStore.theme, (newTheme) => {
  readerTheme.value = newTheme
}, { immediate: true })

watch(() => readerStore.settings.theme, (newTheme) => {
  if (newTheme !== themeStore.theme) {
    themeStore.setTheme(newTheme)
  }
})

const content = computed(() => {
  if (!readerStore.currentBook || !contentRef.value) return ''
  const renderer = new ContentRenderer(readerStore.currentBook, contentRef.value)
  return renderer.render(readerStore.currentSpineIndex)
})

const chapterTitle = computed(() => {
  const book = readerStore.currentBook
  const index = readerStore.currentSpineIndex
  if (!book || !book.spine[index]) return ''
  
  const href = book.spine[index].href
  const tocItem = findTocItem(book.toc, href)
  return tocItem?.title || `第 ${index + 1} 章`
})

function findTocItem(items: EpubTocItem[], href: string): EpubTocItem | null {
  for (const item of items) {
    if (item.href === href) return item
    if (item.children) {
      const found = findTocItem(item.children, href)
      if (found) return found
    }
  }
  return null
}

function handleKeydown(e: KeyboardEvent) {
  if (showToc.value || showSettings.value) return
  
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case ' ':
      readerStore.nextPage()
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      readerStore.prevPage()
      break
    case 'Home':
      readerStore.goToChapter(0)
      break
    case 'End':
      readerStore.goToChapter(readerStore.totalSpineItems - 1)
      break
  }
}

function handleContentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'A' && target.hasAttribute('data-href')) {
    e.preventDefault()
    const href = target.getAttribute('data-href')
    if (href && readerStore.currentBook) {
      const index = readerStore.currentBook.spine.findIndex(
        s => s.href.includes(href.split('#')[0])
      )
      if (index >= 0) {
        readerStore.goToChapter(index)
      }
    }
  }
}

function toggleToc() {
  showToc.value = !showToc.value
  showSettings.value = false
  if (showToc.value) {
    isToolbarVisible.value = true
  }
}

function toggleSettings() {
  showSettings.value = !showSettings.value
  showToc.value = false
  if (showSettings.value) {
    isToolbarVisible.value = true
  }
}

function closePanels() {
  showToc.value = false
  showSettings.value = false
  isToolbarVisible.value = false
}

function showToolbar() {
  isToolbarVisible.value = true
}

function hideToolbar() {
  if (!showToc.value && !showSettings.value) {
    isToolbarVisible.value = false
  }
}

function handleToolbarMouseEnter() {
  isToolbarVisible.value = true
}

watch(() => readerStore.currentSpineIndex, () => {
  readerStore.saveProgress()
  nextTick(() => {
    const wrapper = wrapperRef.value
    if (wrapper) {
      wrapper.scrollTop = 0
      wrapper.scrollTo({ top: 0, behavior: 'auto' })
      setTimeout(() => {
        if (wrapper) {
          wrapper.scrollTop = 0
        }
      }, 50)
    }
    if (contentRef.value) {
      contentRef.value.scrollTop = 0
    }
  })
}, { flush: 'post' })

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  themeStore.initTheme()
  checkFrontendStatus()
  setInterval(checkFrontendStatus, 5000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

async function checkFrontendStatus() {
  frontendStatus.value = 'checking'
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const response = await fetch('http://localhost:3000', { 
      method: 'HEAD',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    frontendStatus.value = response.ok ? 'running' : 'stopped'
  } catch {
    frontendStatus.value = 'stopped'
  }
}
</script>

<template>
  <div class="reader-view" :class="`theme-${readerTheme}`">
    <div 
      class="toolbar-hover-zone"
      @mouseenter="showToolbar"
    ></div>
    <div 
      class="toolbar-wrapper"
      :class="{ visible: isToolbarVisible }"
      @mouseenter="handleToolbarMouseEnter"
      @mouseleave="hideToolbar"
    >
      <Toolbar
        :title="readerStore.currentBook?.metadata.title || ''"
        :chapter-title="chapterTitle"
        :progress="readerStore.progress"
        :can-go-prev="readerStore.currentSpineIndex > 0"
        :can-go-next="readerStore.currentSpineIndex < readerStore.totalSpineItems - 1"
        :frontend-status="frontendStatus"
        @toggle-toc="toggleToc"
        @toggle-settings="toggleSettings"
        @close="readerStore.closeBook"
        @prev-page="readerStore.prevPage"
        @next-page="readerStore.nextPage"
      />
    </div>

    <div class="reader-content-wrapper" ref="wrapperRef" @click.self="closePanels" @mouseenter="hideToolbar">
      <div
        ref="contentRef"
        class="epub-content"
        v-html="content"
        @click="handleContentClick"
      ></div>

      <div class="nav-buttons">
        <button
          class="nav-btn prev"
          :disabled="readerStore.currentSpineIndex === 0"
          @click.stop="readerStore.prevPage"
        >
          ‹ 上一章
        </button>
        <button
          class="nav-btn next"
          :disabled="readerStore.currentSpineIndex >= readerStore.totalSpineItems - 1"
          @click.stop="readerStore.nextPage"
        >
          下一章 ›
        </button>
      </div>
    </div>

    <TocPanel
      v-if="showToc"
      :toc="readerStore.currentBook?.toc || []"
      :current-index="readerStore.currentSpineIndex"
      @select="(index) => { readerStore.goToChapter(index); closePanels() }"
      @close="closePanels"
    />

    <SettingsPanel
      v-if="showSettings"
      :settings="readerStore.settings"
      @update="(s) => readerStore.updateSettings(s)"
      @close="closePanels"
    />

    <div v-if="readerStore.isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-if="readerStore.error" class="error-overlay">
      <p>{{ readerStore.error }}</p>
      <button @click="readerStore.closeBook">返回书架</button>
    </div>
  </div>
</template>

<style scoped>
.reader-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--reader-bg-color, #fff);
  color: var(--reader-text-color, #333);
  position: relative;
}

.toolbar-hover-zone {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  z-index: 99;
  cursor: pointer;
}

.toolbar-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  transform: translateY(-100%);
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  z-index: 100;
}

.toolbar-wrapper.visible {
  transform: translateY(0);
}

.reader-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
}

.nav-buttons {
  display: none;
}

.nav-btn {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
  transition: all 0.2s;
}

[data-theme="dark"] .nav-btn {
  border-color: #444;
  color: #ccc;
}

[data-theme="dark"] .nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.theme-sepia .nav-btn {
  border-color: #d4c9a8;
  color: #5c5340;
}

.theme-sepia .nav-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.nav-btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-overlay,
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-overlay button {
  margin-top: 20px;
  padding: 10px 20px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #999;
}

[data-theme="dark"] ::-webkit-scrollbar-thumb {
  background: #444;
}

[data-theme="dark"] ::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.theme-sepia ::-webkit-scrollbar-thumb {
  background: #c4b896;
}

.theme-sepia ::-webkit-scrollbar-thumb:hover {
  background: #a89c7c;
}
</style>
