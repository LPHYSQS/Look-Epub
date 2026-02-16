<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLibraryStore, useReaderStore, useThemeStore } from '@/stores'
import { db } from '@/storage'

const libraryStore = useLibraryStore()
const readerStore = useReaderStore()
const themeStore = useThemeStore()

const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const searchQuery = ref('')
const importProgress = ref(0)
const importTotal = ref(0)
const importStatus = ref('')
const selectedBooks = ref<string[]>([])
const isSelecting = ref(false)
const showEditModal = ref(false)
const editingBook = ref<any>(null)
const showAbout = ref(false)

const frontendStatus = ref<'running' | 'stopped' | 'checking'>('checking')

const isDragging = ref(false)
const dragCounter = ref(0)

const filteredBooks = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    return libraryStore.sortedBooks
  }
  return libraryStore.sortedBooks.filter(book => {
    const displayTitle = book.customTitle || book.title
    const displayAuthor = book.customAuthor || book.author
    const titleMatch = displayTitle.toLowerCase().includes(query)
    const authorMatch = displayAuthor?.toLowerCase().includes(query)
    return titleMatch || authorMatch
  })
})

function getDisplayTitle(book: any): string {
  return book.customTitle || book.title
}

function getDisplayAuthor(book: any): string {
  return book.customAuthor || book.author
}

function getDisplayCover(book: any): string | undefined {
  return book.customCover || book.cover
}

onMounted(async () => {
  await db.init()
  await libraryStore.loadLibrary()
  themeStore.initTheme()
  await checkMissingBooks()
  checkServicesStatus()
  setInterval(checkServicesStatus, 5000)
})

async function checkServicesStatus() {
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

async function checkMissingBooks() {
  const missingBooks = await readerStore.checkBookAvailability()
  if (missingBooks.length > 0) {
    const titles = missingBooks.map(b => b.title).join('\n')
    alert(`以下书籍文件可能被移动或删除：\n\n${titles}`)
  }
}

function getThemeTooltip(): string {
  if (themeStore.theme === 'light') return '切换到夜间模式'
  if (themeStore.theme === 'dark') return '切换到护眼模式'
  return '切换到白天模式'
}

function triggerFileInput() {
  fileInput.value?.click()
}

function triggerFolderInput() {
  folderInput.value?.click()
}

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.epub')) {
    alert('请选择 EPUB 格式的电子书文件')
    return
  }

  isImporting.value = true
  try {
    const result = await readerStore.importBook(file)
    if (!result) {
      alert('文件损坏，无法导入')
    } else if (result.isDuplicate) {
      alert('该书籍已存在，无需重复导入')
    } else if (result.error) {
      alert('文件损坏，无法导入')
    } else {
      await libraryStore.loadLibrary()
    }
  } finally {
    isImporting.value = false
    input.value = ''
  }
}

async function handleFolderSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  const epubFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.epub'))
  if (epubFiles.length === 0) {
    alert('所选文件夹中没有找到 EPUB 文件')
    return
  }

  isImporting.value = true
  importProgress.value = 0
  importTotal.value = epubFiles.length
  importStatus.value = '正在准备导入...'
  
  let importedCount = 0
  let duplicateCount = 0
  let corruptedCount = 0
  const duplicateNames: string[] = []
  const corruptedNames: string[] = []
  
  try {
    for (let i = 0; i < epubFiles.length; i++) {
      const file = epubFiles[i]
      importStatus.value = `正在导入: ${file.name}`
      importProgress.value = Math.round(((i + 1) / epubFiles.length) * 100)
      
      const result = await readerStore.importBook(file)
      if (!result) {
        corruptedCount++
        corruptedNames.push(file.name)
      } else if (result.isDuplicate) {
        duplicateCount++
        duplicateNames.push(file.name)
      } else if (result.error) {
        corruptedCount++
        corruptedNames.push(file.name)
      } else {
        importedCount++
      }
    }
    
    importStatus.value = '正在刷新书架...'
    
    if (importedCount > 0 || duplicateCount > 0 || corruptedCount > 0) {
      await libraryStore.loadLibrary()
      
      let message = ''
      if (importedCount > 0) {
        message += `成功导入 ${importedCount} 本书籍`
      }
      if (duplicateCount > 0) {
        if (message) message += '\n'
        message += `${duplicateCount} 本书籍已存在:\n${duplicateNames.join('\n')}`
      }
      if (corruptedCount > 0) {
        if (message) message += '\n'
        message += `${corruptedCount} 本书籍文件损坏:\n${corruptedNames.join('\n')}`
      }
      setTimeout(() => alert(message), 300)
    }
  } finally {
    isImporting.value = false
    importProgress.value = 0
    importTotal.value = 0
    importStatus.value = ''
    input.value = ''
  }
}

function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter.value++
  isDragging.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  dragCounter.value = 0
  
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const nonEpubFiles = Array.from(files).filter(f => !f.name.toLowerCase().endsWith('.epub'))
  const epubFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.epub'))
  
  if (files.length === nonEpubFiles.length) {
    alert('请导入 EPUB 格式的电子书文件')
    return
  }
  
  if (nonEpubFiles.length > 0) {
    const nonEpubNames = nonEpubFiles.map(f => f.name).join('\n')
    alert(`以下文件不是 EPUB 格式，已跳过：\n${nonEpubNames}`)
  }

  if (epubFiles.length === 0) return

  isImporting.value = true
  importProgress.value = 0
  importTotal.value = epubFiles.length
  importStatus.value = '正在准备导入...'
  
  let importedCount = 0
  let duplicateCount = 0
  let corruptedCount = 0
  const duplicateNames: string[] = []
  const corruptedNames: string[] = []
  
  try {
    for (let i = 0; i < epubFiles.length; i++) {
      const file = epubFiles[i]
      importStatus.value = `正在导入: ${file.name}`
      importProgress.value = Math.round(((i + 1) / epubFiles.length) * 100)
      
      const result = await readerStore.importBook(file)
      if (!result) {
        corruptedCount++
        corruptedNames.push(file.name)
      } else if (result.isDuplicate) {
        duplicateCount++
        duplicateNames.push(file.name)
      } else if (result.error) {
        if (result.error === 'file_corrupted') {
          corruptedCount++
          corruptedNames.push(file.name)
        } else {
          corruptedCount++
          corruptedNames.push(file.name)
        }
      } else {
        importedCount++
      }
    }
    
    importStatus.value = '正在刷新书架...'
    
    if (importedCount > 0 || duplicateCount > 0 || corruptedCount > 0) {
      await libraryStore.loadLibrary()
      
      let message = ''
      if (importedCount > 0) {
        message += `成功导入 ${importedCount} 本书籍`
      }
      if (duplicateCount > 0) {
        if (message) message += '\n'
        message += `${duplicateCount} 本书籍已存在:\n${duplicateNames.join('\n')}`
      }
      if (corruptedCount > 0) {
        if (message) message += '\n'
        message += `${corruptedCount} 本书籍文件损坏:\n${corruptedNames.join('\n')}`
      }
      setTimeout(() => alert(message), 300)
    }
  } finally {
    isImporting.value = false
    importProgress.value = 0
    importTotal.value = 0
    importStatus.value = ''
  }
}

async function openBook(id: string) {
  await readerStore.loadBookFromLibrary(id)
}

async function deleteBook(id: string, e: Event) {
  e.stopPropagation()
  if (confirm('确定要删除这本书吗？')) {
    await libraryStore.deleteBook(id)
  }
}

function toggleSelectMode() {
  isSelecting.value = !isSelecting.value
  if (!isSelecting.value) {
    selectedBooks.value = []
  }
}

function selectAllBooks() {
  selectedBooks.value = filteredBooks.value.map(book => book.id)
}

function deselectAllBooks() {
  selectedBooks.value = []
}

function toggleBookSelection(id: string, e: Event) {
  e.stopPropagation()
  const index = selectedBooks.value.indexOf(id)
  if (index === -1) {
    selectedBooks.value.push(id)
  } else {
    selectedBooks.value.splice(index, 1)
  }
}

function isBookSelected(id: string): boolean {
  return selectedBooks.value.includes(id)
}

async function deleteSelectedBooks() {
  if (selectedBooks.value.length === 0) return
  
  const count = selectedBooks.value.length
  if (confirm(`确定要删除选中的 ${count} 本书吗？`)) {
    await libraryStore.deleteBooks(selectedBooks.value)
    selectedBooks.value = []
    isSelecting.value = false
  }
}

function openEditModal(book: any, e: Event) {
  e.stopPropagation()
  editingBook.value = { ...book }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingBook.value = null
}

function closeAbout() {
  showAbout.value = false
}

async function saveBookEdit() {
  if (!editingBook.value) return
  
  await libraryStore.updateBook(editingBook.value.id, {
    customTitle: editingBook.value.customTitle || undefined,
    customAuthor: editingBook.value.customAuthor || undefined,
    customCover: editingBook.value.customCover || undefined
  })
  
  closeEditModal()
}

function handleCoverUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = () => {
    if (editingBook.value) {
      editingBook.value.customCover = reader.result as string
    }
  }
  reader.readAsDataURL(file)
}

function exitApp() {
  if (confirm('确定要退出应用吗？')) {
    window.close()
    setTimeout(() => {
      alert('请关闭浏览器标签页来退出应用')
    }, 100)
  }
}

function restartApp() {
  if (confirm('确定要重启应用吗？')) {
    window.location.reload()
  }
}
</script>

<template>
  <div 
    class="library-view"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <header class="library-header">
      <div class="header-left">
        <button class="action-btn theme-btn" @click="themeStore.toggleTheme" :title="getThemeTooltip()">
          <svg v-if="themeStore.isDark" viewBox="0 0 24 24" width="22" height="22">
            <path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
          </svg>
          <svg v-else-if="themeStore.isSepia" viewBox="0 0 24 24" width="22" height="22">
            <path fill="currentColor" d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="22" height="22">
            <path fill="currentColor" d="M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54 0 4.48-2.94 8.27-7 9.54.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z"/>
          </svg>
        </button>
        <div class="service-status">
          <div class="status-item" :class="frontendStatus" title="前端服务">
            <span class="status-dot"></span>
            <span class="status-label">前端</span>
          </div>
        </div>
      </div>
      <div class="header-content">
        <h1>📚 Look Epub</h1>
        <p>EPUB 电子书阅读器</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索书名或作者..."
            class="search-input"
          />
        </div>
        <button class="action-btn" @click="restartApp" title="重启应用">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
        <button class="action-btn" @click="showAbout = true" title="关于">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </button>
        <button class="action-btn exit" @click="exitApp" title="退出应用">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="import-section">
      <input
        ref="fileInput"
        type="file"
        accept=".epub"
        @change="handleFileSelect"
        hidden
      />
      <input
        ref="folderInput"
        type="file"
        accept=".epub"
        @change="handleFolderSelect"
        multiple
        webkitdirectory
        hidden
      />
      <div class="import-buttons">
        <button class="import-btn" @click="triggerFileInput" :disabled="isImporting">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          {{ isImporting ? '导入中...' : '导入 EPUB' }}
        </button>
        <button class="import-btn" @click="triggerFolderInput" :disabled="isImporting">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
          </svg>
          批量导入文件夹
        </button>
        <button 
          class="import-btn" 
          :class="{ active: isSelecting }"
          @click="toggleSelectMode"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>
          </svg>
          {{ isSelecting ? '取消选择' : '批量管理' }}
        </button>
      </div>

      <div class="batch-actions" v-if="isSelecting">
        <div class="batch-left">
          <span class="selected-count">已选择 {{ selectedBooks.length }} 本书</span>
          <button class="batch-select-btn" @click="selectAllBooks" v-if="selectedBooks.length < filteredBooks.length">
            全选
          </button>
          <button class="batch-select-btn" @click="deselectAllBooks" v-if="selectedBooks.length > 0">
            取消全选
          </button>
        </div>
        <button class="batch-delete-btn" @click="deleteSelectedBooks" v-if="selectedBooks.length > 0">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          批量删除
        </button>
      </div>

      <div class="import-progress" v-if="isImporting && importTotal > 0">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: importProgress + '%' }"></div>
        </div>
        <div class="progress-info">
          <span class="progress-text">{{ importProgress }}%</span>
          <span class="progress-status">{{ importStatus }}</span>
          <span class="progress-count">{{ importTotal }} 个文件</span>
        </div>
      </div>

      <div class="drag-overlay" v-if="isDragging">
        <div class="drag-content">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
          </svg>
          <p>拖放 EPUB 文件到这里导入</p>
        </div>
      </div>
    </div>

    <div class="book-grid" v-if="filteredBooks.length > 0">
      <div
        v-for="book in filteredBooks"
        :key="book.id"
        class="book-card"
        :class="{ selected: isBookSelected(book.id) }"
        @click="openBook(book.id)"
      >
        <button class="edit-btn" :class="{ 'with-checkbox': isSelecting }" @click="openEditModal(book, $event)" title="编辑">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <div class="book-checkbox" v-if="isSelecting" @click="toggleBookSelection(book.id, $event)">
          <div class="checkbox" :class="{ checked: isBookSelected(book.id) }">
            <svg v-if="isBookSelected(book.id)" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
        </div>
        <div class="book-cover">
          <img v-if="getDisplayCover(book)" :src="getDisplayCover(book)" alt="封面" />
          <div v-else class="book-cover-placeholder">
            <span>{{ getDisplayTitle(book).charAt(0) }}</span>
          </div>
        </div>
        <div class="book-info">
          <h3 class="book-title">{{ getDisplayTitle(book) }}</h3>
          <p class="book-author">{{ getDisplayAuthor(book) }}</p>
        </div>
        <div class="book-progress" v-if="book.readProgress && book.readProgress > 0">
          <div class="book-progress-bar">
            <div class="book-progress-fill" :style="{ width: book.readProgress + '%' }"></div>
          </div>
        </div>
        <button class="delete-btn" @click="deleteBook(book.id, $event)" title="删除">
          ×
        </button>
      </div>
    </div>

    <div class="empty-state" v-else-if="!libraryStore.isLoading">
      <template v-if="searchQuery && filteredBooks.length === 0">
        <div class="empty-icon">
          <svg viewBox="0 0 120 120" width="100" height="100">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
            <path d="M45 50 L60 65 L75 50" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="60" cy="75" r="3" fill="rgba(255,255,255,0.5)"/>
          </svg>
        </div>
        <h2>未找到相关书籍</h2>
        <p>没有找到匹配"{{ searchQuery }}"的书籍</p>
      </template>
      <template v-else>
        <div class="empty-icon">
          <svg viewBox="0 0 120 120" width="100" height="100">
            <rect x="20" y="25" width="35" height="70" rx="3" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2.5"/>
            <rect x="25" y="32" width="25" height="4" rx="1" fill="rgba(255,255,255,0.25)"/>
            <rect x="25" y="40" width="20" height="3" rx="1" fill="rgba(255,255,255,0.2)"/>
            <rect x="25" y="46" width="22" height="3" rx="1" fill="rgba(255,255,255,0.2)"/>
            <rect x="65" y="25" width="35" height="70" rx="3" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2.5"/>
            <rect x="70" y="32" width="25" height="4" rx="1" fill="rgba(255,255,255,0.25)"/>
            <rect x="70" y="40" width="18" height="3" rx="1" fill="rgba(255,255,255,0.2)"/>
            <rect x="70" y="46" width="20" height="3" rx="1" fill="rgba(255,255,255,0.2)"/>
            <path d="M35 15 L60 5 L85 15" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="30" y="20" width="60" height="8" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          </svg>
        </div>
        <h2>书架空空如也</h2>
        <p>点击上方按钮或拖拽 EPUB 文件到此处导入您的第一本电子书</p>
      </template>
    </div>

    <div class="loading-state" v-if="libraryStore.isLoading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div class="modal-overlay" v-if="showEditModal" @click.self="closeEditModal">
      <div class="edit-modal">
        <div class="modal-header">
          <h2>编辑书籍信息</h2>
          <button class="modal-close" @click="closeEditModal">×</button>
        </div>
        <div class="modal-body" v-if="editingBook">
          <div class="cover-upload">
            <div class="cover-preview">
              <img v-if="editingBook.customCover || editingBook.cover" :src="editingBook.customCover || editingBook.cover" alt="封面预览" />
              <div v-else class="cover-placeholder">
                <span>{{ (editingBook.customTitle || editingBook.title).charAt(0) }}</span>
              </div>
            </div>
            <label class="upload-btn">
              <input type="file" accept="image/*" @change="handleCoverUpload" hidden />
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z"/>
              </svg>
              上传封面
            </label>
            <button class="remove-cover-btn" v-if="editingBook.customCover" @click="editingBook.customCover = ''">
              移除封面
            </button>
          </div>
          <div class="form-group">
            <label>书名</label>
            <input type="text" v-model="editingBook.customTitle" :placeholder="editingBook.title" />
          </div>
          <div class="form-group">
            <label>作者</label>
            <input type="text" v-model="editingBook.customAuthor" :placeholder="editingBook.author || '未知作者'" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeEditModal">取消</button>
          <button class="save-btn" @click="saveBookEdit">保存</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay about-overlay" v-if="showAbout" @click.self="closeAbout">
      <div class="about-modal">
        <button class="about-close" @click="closeAbout">×</button>
        <div class="about-content">
          <div class="about-logo">📚</div>
          <h2 class="about-title">Look Epub</h2>
          <div class="about-version">版本 V0.2</div>
          <div class="about-divider"></div>
          <div class="about-section">
            <h3>项目信息</h3>
            <p><strong>更新日期：</strong>2026年2月16日</p>
            <p><strong>第二版更新</strong></p>
            <p><strong>项目作者：</strong>已逝情殇</p>
          </div>
          <div class="about-divider"></div>
          <div class="about-section">
            <h3>技术栈</h3>
            <div class="tech-tags">
              <span class="tech-tag">Vue 3</span>
              <span class="tech-tag">TypeScript</span>
              <span class="tech-tag">Vite</span>
              <span class="tech-tag">Pinia</span>
              <span class="tech-tag">IndexedDB</span>
            </div>
          </div>
          <div class="about-divider"></div>
          <div class="about-section">
            <h3>项目说明</h3>
            <p class="about-desc">
              Look Epub 是一款纯本地化运行的 EPUB 电子书阅读器。<br/><br/>
              无需网络连接，所有数据存储在本地浏览器中，保护您的隐私。<br/><br/>
              支持多种主题切换、阅读进度记忆、书籍管理等功能。
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-view {
  min-height: 100vh;
  padding: 40px 20px;
}

:root, [data-theme="light"] .library-view {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --header-color: #fff;
}

[data-theme="dark"] .library-view {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  --header-color: #e0e0e0;
}

[data-theme="sepia"] .library-view {
  background: linear-gradient(135deg, #f4ecd8 0%, #e8dcc8 100%);
  --header-color: #3d3426;
}

[data-theme="dark"] .library-header {
  color: var(--header-color);
}

[data-theme="sepia"] .library-header {
  color: var(--header-color);
}

[data-theme="sepia"] .library-header p {
  color: #6b5f4d;
}

[data-theme="dark"] .library-header p {
  color: #aaa;
}

[data-theme="sepia"] .import-btn {
  background: rgba(0, 0, 0, 0.08);
  border-color: #d4c9a8;
}

[data-theme="sepia"] .import-btn:hover {
  background: rgba(0, 0, 0, 0.12);
}

[data-theme="sepia"] .import-progress {
  background: rgba(244, 236, 216, 0.95);
}

[data-theme="sepia"] .progress-bar {
  background: rgba(0, 0, 0, 0.1);
}

[data-theme="sepia"] .progress-info {
  color: #5c5340;
}

[data-theme="sepia"] .progress-count {
  color: #8b7355;
}

[data-theme="dark"] .import-btn {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

[data-theme="dark"] .import-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

[data-theme="dark"] .import-progress {
  background: rgba(30, 30, 50, 0.95);
}

[data-theme="dark"] .progress-bar {
  background: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .progress-info {
  color: #aaa;
}

[data-theme="dark"] .progress-count {
  color: #777;
}

[data-theme="dark"] .book-card {
  background: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .book-progress {
  background: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .book-progress-fill {
  background: linear-gradient(90deg, #667eea 0%, #9f7aea 100%);
}

[data-theme="dark"] .book-info {
  background: rgba(30, 30, 50, 0.8);
}

[data-theme="dark"] .book-title {
  color: #e0e0e0;
}

[data-theme="dark"] .book-author {
  color: #999;
}

[data-theme="dark"] .empty-state {
  color: #e0e0e0;
}

[data-theme="dark"] .empty-icon svg path,
[data-theme="dark"] .empty-icon svg rect,
[data-theme="dark"] .empty-icon svg circle {
  stroke: rgba(160, 160, 255, 0.5) !important;
  fill: none !important;
}

[data-theme="dark"] .empty-icon svg path[fill="none"] {
  stroke: rgba(160, 160, 255, 0.5) !important;
}

[data-theme="dark"] .empty-icon svg circle {
  stroke: rgba(160, 160, 255, 0.4) !important;
}

[data-theme="sepia"] .empty-state {
  color: #3d3426;
}

[data-theme="sepia"] .empty-state p {
  color: #6b5f4d;
}

[data-theme="sepia"] .empty-icon svg path,
[data-theme="sepia"] .empty-icon svg rect,
[data-theme="sepia"] .empty-icon svg circle {
  stroke: rgba(80, 65, 45, 0.5) !important;
  fill: none !important;
}

[data-theme="sepia"] .book-card {
  background: rgba(255, 255, 255, 0.5);
}

[data-theme="sepia"] .book-progress {
  background: rgba(0, 0, 0, 0.08);
}

[data-theme="sepia"] .book-progress-fill {
  background: linear-gradient(90deg, #8b7355 0%, #a08060 100%);
}

[data-theme="sepia"] .book-info {
  background: rgba(255, 248, 230, 0.9);
}

[data-theme="sepia"] .book-title {
  color: #3d3426;
}

[data-theme="sepia"] .book-author {
  color: #6b5f4d;
}

[data-theme="dark"] .action-btn {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .action-btn.exit:hover {
  background: rgba(231, 76, 60, 0.6);
}

[data-theme="dark"] .search-box {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .search-input {
  color: #ddd;
}

[data-theme="dark"] .search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

[data-theme="sepia"] .action-btn {
  background: rgba(0, 0, 0, 0.08);
  border-color: #d4c9a8;
}

[data-theme="sepia"] .action-btn:hover {
  background: rgba(0, 0, 0, 0.12);
}

[data-theme="sepia"] .action-btn.exit:hover {
  background: rgba(231, 76, 60, 0.6);
}

[data-theme="sepia"] .search-box {
  background: rgba(0, 0, 0, 0.08);
  border-color: #d4c9a8;
}

[data-theme="sepia"] .search-input {
  color: #5c5340;
}

[data-theme="sepia"] .search-input::placeholder {
  color: rgba(92, 83, 64, 0.6);
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  color: #fff;
  margin-bottom: 40px;
  position: relative;
}

.header-left {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.service-status {
  display: flex;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.15);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
}

.status-item.running .status-dot {
  background: #4ade80;
  box-shadow: 0 0 6px #4ade80;
}

.status-item.stopped .status-dot {
  background: #f87171;
}

.status-item.checking .status-dot {
  background: #fbbf24;
  animation: pulse 1s infinite;
}

[data-theme="sepia"] .status-item {
  background: rgba(92, 83, 64, 0.2);
}

[data-theme="sepia"] .status-label {
  color: #5c5340;
}

[data-theme="sepia"] .status-dot {
  border-color: #5c5340;
}

[data-theme="sepia"] .status-item.running .status-dot {
  background: #16a34a;
  border-color: #15803d;
  box-shadow: 0 0 6px #16a34a;
}

[data-theme="sepia"] .status-item.stopped .status-dot {
  background: #dc2626;
  border-color: #b91c1c;
}

[data-theme="sepia"] .status-item.checking .status-dot {
  background: #d97706;
  border-color: #b45309;
}

.status-label {
  color: rgba(255, 255, 255, 0.9);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.header-content {
  text-align: center;
  flex: 1;
}

.library-header h1 {
  font-size: 36px;
  margin: 0 0 10px;
}

.library-header p {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

.header-actions {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: #fff;
}

.search-box svg {
  flex-shrink: 0;
}

.search-input {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 14px;
  width: 150px;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.action-btn {
  width: 40px;
  height: 40px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-btn.exit:hover {
  background: rgba(231, 76, 60, 0.6);
}

.import-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 40px;
}

.import-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.import-section .import-btn {
  flex-direction: row;
}

.import-section .import-btn.active {
  background: #667eea;
  color: #fff;
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.batch-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-select-btn {
  padding: 6px 12px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-select-btn:hover {
  background: #667eea;
  border-color: #667eea;
  color: #fff;
}

.selected-count {
  font-size: 14px;
  color: #667eea;
  font-weight: 600;
}

.batch-delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-delete-btn:hover {
  background: #c0392b;
}

.book-card {
  position: relative;
}

.book-card.selected {
  box-shadow: 0 0 0 3px #667eea;
}

.book-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.book-progress-bar {
  height: 100%;
  width: 100%;
}

.book-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f97316 0%, #ef4444 100%);
  box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
  transition: width 0.3s ease;
}

.book-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  cursor: pointer;
}

.checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid #ccc;
  border-radius: 4px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox.checked {
  background: #667eea;
  border-color: #667eea;
  color: #fff;
}

.edit-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  opacity: 0;
  transition: all 0.2s;
  z-index: 5;
}

.edit-btn.with-checkbox {
  left: 40px;
}

.book-card:hover .edit-btn {
  opacity: 1;
}

.edit-btn:hover {
  background: #667eea;
  color: #fff;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-modal {
  width: 90%;
  max-width: 450px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.modal-close {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: #f5f5f5;
  color: #333;
}

.modal-body {
  padding: 24px;
}

.cover-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.cover-preview {
  width: 120px;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 36px;
  font-weight: bold;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover {
  background: #eee;
  border-color: #667eea;
  color: #667eea;
}

.remove-cover-btn {
  padding: 6px 12px;
  background: none;
  border: none;
  font-size: 12px;
  color: #e74c3c;
  cursor: pointer;
}

.remove-cover-btn:hover {
  text-decoration: underline;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #666;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #eee;
}

.cancel-btn, .save-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  color: #666;
}

.cancel-btn:hover {
  background: #eee;
}

.save-btn {
  background: #667eea;
  border: none;
  color: #fff;
}

.save-btn:hover {
  background: #5a6fd6;
}

[data-theme="dark"] .batch-actions {
  background: rgba(30, 30, 50, 0.95);
}

[data-theme="dark"] .batch-select-btn {
  background: rgba(60, 60, 80, 0.9);
  border-color: #555;
  color: #aaa;
}

[data-theme="dark"] .batch-select-btn:hover {
  background: #667eea;
  border-color: #667eea;
  color: #fff;
}

[data-theme="dark"] .selected-count {
  color: #a0a0ff;
}

[data-theme="dark"] .checkbox {
  background: rgba(30, 30, 50, 0.9);
  border-color: #555;
}

[data-theme="dark"] .edit-btn {
  background: rgba(30, 30, 50, 0.9);
  color: #a0a0ff;
}

[data-theme="dark"] .edit-btn:hover {
  background: #667eea;
  color: #fff;
}

[data-theme="dark"] .edit-modal {
  background: #2a2a3e;
}

[data-theme="dark"] .modal-header {
  border-bottom-color: #444;
}

[data-theme="dark"] .modal-header h2 {
  color: #ddd;
}

[data-theme="dark"] .modal-close {
  color: #999;
}

[data-theme="dark"] .modal-close:hover {
  background: #3a3a4e;
  color: #ddd;
}

[data-theme="dark"] .modal-body {
  background: #2a2a3e;
}

[data-theme="dark"] .cover-preview {
  background: #3a3a4e;
}

[data-theme="dark"] .form-group label {
  color: #aaa;
}

[data-theme="dark"] .form-group input {
  background: #3a3a4e;
  border-color: #444;
  color: #ddd;
}

[data-theme="dark"] .modal-footer {
  border-top-color: #444;
}

[data-theme="dark"] .cancel-btn {
  background: #3a3a4e;
  border-color: #555;
  color: #aaa;
}

[data-theme="dark"] .cancel-btn:hover {
  background: #4a4a5e;
}

[data-theme="sepia"] .batch-actions {
  background: rgba(244, 236, 216, 0.95);
}

[data-theme="sepia"] .batch-select-btn {
  background: rgba(0, 0, 0, 0.05);
  border-color: #d4c9a8;
  color: #6b5f4d;
}

[data-theme="sepia"] .batch-select-btn:hover {
  background: #667eea;
  border-color: #667eea;
  color: #fff;
}

[data-theme="sepia"] .selected-count {
  color: #8b7355;
}

[data-theme="sepia"] .edit-modal {
  background: #f4ecd8;
}

[data-theme="sepia"] .modal-header {
  border-bottom-color: #d4c9a8;
}

[data-theme="sepia"] .modal-header h2 {
  color: #5c5340;
}

[data-theme="sepia"] .modal-body {
  background: #f4ecd8;
}

[data-theme="sepia"] .cover-preview {
  background: #e8dfc8;
}

[data-theme="sepia"] .form-group label {
  color: #8b7355;
}

[data-theme="sepia"] .form-group input {
  background: #e8dfc8;
  border-color: #d4c9a8;
  color: #5c5340;
}

[data-theme="sepia"] .modal-footer {
  border-top-color: #d4c9a8;
}

.import-progress {
  width: 100%;
  max-width: 500px;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  font-size: 13px;
  color: #666;
}

.progress-text {
  font-weight: 600;
  color: #667eea;
}

.progress-status {
  flex: 1;
  text-align: center;
  margin: 0 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.progress-count {
  color: #999;
}

.import-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 15px 30px;
  background: #fff;
  color: #667eea;
  border: none;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.import-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.import-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 25px;
  max-width: 1200px;
  margin: 0 auto;
}

.book-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  position: relative;
}

.book-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.book-cover {
  width: 100%;
  height: 240px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-cover-placeholder span {
  font-size: 80px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: bold;
}

.book-info {
  padding: 15px;
}

.book-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-author {
  font-size: 12px;
  color: #999;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #e74c3c;
}

.empty-state {
  text-align: center;
  color: #fff;
  padding: 60px 20px;
}

.empty-icon {
  margin-bottom: 20px;
}

.empty-icon svg {
  display: block;
  margin: 0 auto;
}

.empty-state h2 {
  font-size: 24px;
  margin: 0 0 10px;
}

.empty-state p {
  font-size: 16px;
  opacity: 0.8;
  margin: 0;
}

.loading-state {
  text-align: center;
  color: #fff;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.drag-content {
  text-align: center;
  color: #fff;
}

.drag-content svg {
  margin-bottom: 20px;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.drag-content p {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

[data-theme="dark"] .drag-overlay {
  background: rgba(26, 26, 46, 0.95);
}

[data-theme="sepia"] .drag-overlay {
  background: rgba(244, 236, 216, 0.95);
  color: #3d3426;
}

.about-overlay {
  backdrop-filter: blur(8px);
}

.about-modal {
  width: 90%;
  max-width: 420px;
  background: linear-gradient(145deg, #ffffff 0%, #f8f9ff 100%);
  border-radius: 24px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.about-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  font-size: 22px;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.about-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.about-content {
  padding: 40px 32px;
  text-align: center;
}

.about-logo {
  font-size: 64px;
  margin-bottom: 12px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.about-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.about-version {
  display: inline-block;
  padding: 4px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 20px;
  margin-bottom: 20px;
}

.about-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
  margin: 20px 0;
}

.about-section {
  text-align: left;
}

.about-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.about-section p {
  font-size: 14px;
  color: #555;
  line-height: 1.8;
  margin: 8px 0;
}

.about-section strong {
  color: #333;
}

.about-desc {
  font-size: 13px !important;
  line-height: 1.9 !important;
  color: #666 !important;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.tech-tag {
  padding: 6px 14px;
  background: linear-gradient(135deg, #f5f7ff 0%, #e8ecff 100%);
  border: 1px solid #e0e5ff;
  color: #5a67d8;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  transition: all 0.2s;
}

.tech-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

[data-theme="dark"] .about-modal {
  background: linear-gradient(145deg, #1e2140 0%, #16213e 100%);
}

[data-theme="dark"] .about-title {
  background: linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

[data-theme="dark"] .about-section p {
  color: #a0aec0;
}

[data-theme="dark"] .about-section strong {
  color: #e2e8f0;
}

[data-theme="dark"] .about-desc {
  color: #94a3b8 !important;
}

[data-theme="dark"] .about-close {
  background: rgba(255, 255, 255, 0.1);
  color: #a0aec0;
}

[data-theme="dark"] .about-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
}

[data-theme="dark"] .about-divider {
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}

[data-theme="dark"] .tech-tag {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
}

[data-theme="sepia"] .about-modal {
  background: linear-gradient(145deg, #faf8f0 0%, #f4ecd8 100%);
}

[data-theme="sepia"] .about-title {
  background: linear-gradient(135deg, #8b7355 0%, #6b5744 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

[data-theme="sepia"] .about-section h3 {
  color: #8b7355;
}

[data-theme="sepia"] .about-section p {
  color: #5c5340;
}

[data-theme="sepia"] .about-section strong {
  color: #3d3426;
}

[data-theme="sepia"] .about-desc {
  color: #6b5f4d !important;
}

[data-theme="sepia"] .about-close {
  background: rgba(92, 83, 64, 0.1);
  color: #5c5340;
}

[data-theme="sepia"] .about-divider {
  background: linear-gradient(90deg, transparent, rgba(92, 83, 64, 0.2), transparent);
}

[data-theme="sepia"] .tech-tag {
  background: rgba(139, 115, 85, 0.15);
  border-color: rgba(139, 115, 85, 0.3);
  color: #8b7355;
}
</style>
