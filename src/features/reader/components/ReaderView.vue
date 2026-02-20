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

const loadedChapters = ref<Set<number>>(new Set([0]))
const isLoadingMore = ref(false)
const currentVisibleChapter = ref(0)
const isScrollingToChapter = ref(false)

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
  if (!readerStore.currentBook) return ''
  const renderer = new ContentRenderer(readerStore.currentBook, null as any)
  
  if (readerStore.settings.continuousReading) {
    const chapters: string[] = []
    const sortedIndices = Array.from(loadedChapters.value).sort((a, b) => a - b)
    for (const index of sortedIndices) {
      const chapterContent = renderer.render(index)
      const title = getChapterTitleByIndex(index)
      chapters.push(`<div class="chapter-section" data-chapter-index="${index}" data-chapter-title="${title}">${chapterContent}</div>`)
    }
    return chapters.join('<div class="chapter-divider"></div>')
  } else {
    return renderer.render(readerStore.currentSpineIndex)
  }
})

const chapterTitle = computed(() => {
  if (readerStore.settings.continuousReading) {
    const index = currentVisibleChapter.value
    return getChapterTitleByIndex(index)
  }
  return getChapterTitleByIndex(readerStore.currentSpineIndex)
})

function getChapterTitleByIndex(index: number): string {
  const book = readerStore.currentBook
  if (!book || !book.spine[index]) return ''
  
  const href = book.spine[index].href
  const tocItem = findTocItem(book.toc, href)
  return tocItem?.title || `第 ${index + 1} 章`
}

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
        if (readerStore.settings.continuousReading) {
          loadedChapters.value = new Set([index])
          currentVisibleChapter.value = index
        }
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

function handleScroll() {
  if (!readerStore.settings.continuousReading) return
  
  const wrapper = wrapperRef.value
  if (!wrapper) return
  
  updateVisibleChapter()
  
  const { scrollTop, scrollHeight, clientHeight } = wrapper
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200
  
  if (isNearBottom && !isLoadingMore.value) {
    loadNextChapter()
  }
}

function updateVisibleChapter() {
  if (!contentRef.value || !wrapperRef.value) return
  
  const sections = contentRef.value.querySelectorAll('.chapter-section')
  const wrapperRect = wrapperRef.value.getBoundingClientRect()
  const wrapperCenter = wrapperRect.top + wrapperRect.height / 3
  
  let closestIndex = currentVisibleChapter.value
  let closestDistance = Infinity
  
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect()
    const sectionCenter = rect.top + rect.height / 2
    const distance = Math.abs(sectionCenter - wrapperCenter)
    
    if (distance < closestDistance) {
      closestDistance = distance
      const index = parseInt(section.getAttribute('data-chapter-index') || '0')
      closestIndex = index
    }
  })
  
  if (closestIndex !== currentVisibleChapter.value) {
    currentVisibleChapter.value = closestIndex
    isScrollingToChapter.value = true
    readerStore.currentSpineIndex = closestIndex
    readerStore.saveProgress()
    setTimeout(() => {
      isScrollingToChapter.value = false
    }, 100)
  }
}

async function loadNextChapter() {
  if (!readerStore.currentBook || isLoadingMore.value) return
  
  const maxLoaded = Math.max(...Array.from(loadedChapters.value))
  const nextIndex = maxLoaded + 1
  
  if (nextIndex >= readerStore.totalSpineItems) return
  if (loadedChapters.value.has(nextIndex)) return
  
  isLoadingMore.value = true
  
  const newChapters = new Set(loadedChapters.value)
  newChapters.add(nextIndex)
  loadedChapters.value = newChapters
  
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 50))
  
  isLoadingMore.value = false
}

watch(() => readerStore.currentSpineIndex, (newIndex) => {
  if (readerStore.settings.continuousReading) {
    if (!loadedChapters.value.has(newIndex)) {
      loadedChapters.value = new Set([newIndex])
      currentVisibleChapter.value = newIndex
    }
  } else {
    loadedChapters.value = new Set([newIndex])
    currentVisibleChapter.value = newIndex
  }
  readerStore.saveProgress()
  
  if (isScrollingToChapter.value) return
  
  nextTick(() => {
    const wrapper = wrapperRef.value
    if (wrapper) {
      if (readerStore.settings.continuousReading) {
        const targetSection = contentRef.value?.querySelector(`[data-chapter-index="${newIndex}"]`)
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'auto', block: 'start' })
        } else {
          loadedChapters.value = new Set([newIndex])
          currentVisibleChapter.value = newIndex
          nextTick(() => {
            const newTargetSection = contentRef.value?.querySelector(`[data-chapter-index="${newIndex}"]`)
            if (newTargetSection) {
              newTargetSection.scrollIntoView({ behavior: 'auto', block: 'start' })
            }
          })
        }
      } else {
        wrapper.scrollTop = 0
        wrapper.scrollTo({ top: 0, behavior: 'auto' })
        setTimeout(() => {
          if (wrapper) {
            wrapper.scrollTop = 0
          }
        }, 50)
      }
    }
    if (contentRef.value && !readerStore.settings.continuousReading) {
      contentRef.value.scrollTop = 0
    }
  })
}, { flush: 'post' })

watch(() => readerStore.settings.continuousReading, (enabled) => {
  if (enabled) {
    loadedChapters.value = new Set([readerStore.currentSpineIndex])
    currentVisibleChapter.value = readerStore.currentSpineIndex
  } else {
    loadedChapters.value = new Set([readerStore.currentSpineIndex])
  }
})

watch(chapterTitle, (newTitle) => {
  if (newTitle && readerStore.currentBook) {
    const chapterIndex = readerStore.settings.continuousReading 
      ? currentVisibleChapter.value + 1 
      : readerStore.currentSpineIndex + 1
    
    if (newTitle.match(/^第\s*\d+\s*章/)) {
      document.title = newTitle
    } else {
      document.title = `第${chapterIndex}章 ${newTitle}`
    }
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  themeStore.initTheme()
  checkFrontendStatus()
  setInterval(checkFrontendStatus, 5000)
  
  loadedChapters.value = new Set([readerStore.currentSpineIndex])
  currentVisibleChapter.value = readerStore.currentSpineIndex
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

function scrollToTop() {
  const wrapper = wrapperRef.value
  if (wrapper) {
    wrapper.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function scrollToBottom() {
  const wrapper = wrapperRef.value
  if (wrapper) {
    wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: 'smooth' })
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
        :remaining-time-text="readerStore.remainingTimeText"
        @toggle-toc="toggleToc"
        @toggle-settings="toggleSettings"
        @close="readerStore.closeBook"
        @prev-page="readerStore.prevPage"
        @next-page="readerStore.nextPage"
      />
    </div>

    <div class="reader-content-wrapper" ref="wrapperRef" @click.self="closePanels" @mouseenter="hideToolbar" @scroll="handleScroll">
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

    <div class="scroll-buttons">
      <button class="scroll-btn scroll-top" @click="scrollToTop" title="滚动到顶部">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
        </svg>
      </button>
      <button class="scroll-btn scroll-bottom" @click="scrollToBottom" title="滚动到底部">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
        </svg>
      </button>
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

.chapter-section {
  position: relative;
}

.chapter-divider {
  height: 1px;
  margin: 40px 0;
  background: linear-gradient(to right, transparent, #ddd, transparent);
}

[data-theme="dark"] .chapter-divider {
  background: linear-gradient(to right, transparent, #444, transparent);
}

.theme-sepia .chapter-divider {
  background: linear-gradient(to right, transparent, #d4c9a8, transparent);
}

.scroll-buttons {
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 50;
}

.scroll-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05);
  transition: all 0.25s ease;
}

.scroll-btn:hover {
  background: #fff;
  color: #4a90d9;
  transform: scale(1.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(74, 144, 217, 0.3);
}

.scroll-btn:active {
  transform: scale(0.95);
}

.scroll-btn svg {
  transition: transform 0.2s ease;
}

.scroll-btn:hover svg {
  transform: translateY(-2px);
}

.scroll-bottom:hover svg {
  transform: translateY(2px);
}

[data-theme="dark"] .scroll-btn {
  background: rgba(40, 40, 60, 0.95);
  color: #aaa;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

[data-theme="dark"] .scroll-btn:hover {
  background: rgba(50, 50, 70, 0.98);
  color: #6db3f2;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(109, 179, 242, 0.3);
}

.theme-sepia .scroll-btn {
  background: rgba(244, 236, 216, 0.95);
  color: #8b7355;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(139, 115, 85, 0.1);
}

.theme-sepia .scroll-btn:hover {
  background: #f4ecd8;
  color: #6b8e5a;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(107, 142, 90, 0.3);
}
</style>
