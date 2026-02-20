import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EpubBook, ReaderSettings, EpubLocation, ReadingStats, ChapterReadingRecord } from '@/types'
import { EpubParser } from '@/core/parser'
import { StyleInjector } from '@/core/renderer'
import { db, loadSettings, saveSettings } from '@/storage'
import {
  countChars,
  calculateReadingSpeed,
  createEmptyReadingStats,
  addReadingRecord,
  updateChapterCharCount,
  estimateRemainingTime,
  formatReadingTime
} from '@/utils/reading-stats'

export const useReaderStore = defineStore('reader', () => {
  const currentBook = ref<EpubBook | null>(null)
  const bookId = ref<string | null>(null)
  const currentSpineIndex = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const settings = ref<ReaderSettings>(loadSettings())
  const styleInjector = new StyleInjector()
  
  const readingStats = ref<ReadingStats | null>(null)
  const chapterStartTime = ref<number>(0)
  const lastSpineIndex = ref<number>(-1)

  const totalSpineItems = computed(() => currentBook.value?.spine.length || 0)
  
  const currentChapter = computed(() => {
    if (!currentBook.value) return null
    return currentBook.value.spine[currentSpineIndex.value]
  })

  const progress = computed(() => {
    if (!currentBook.value || totalSpineItems.value === 0) return 0
    return Math.round((currentSpineIndex.value / totalSpineItems.value) * 100)
  })

  const location = computed<EpubLocation | null>(() => {
    if (!currentBook.value || !currentChapter.value) return null
    return {
      spineIndex: currentSpineIndex.value,
      chapterHref: currentChapter.value.href,
      progress: progress.value
    }
  })

  const remainingTimeMinutes = computed(() => {
    if (!currentBook.value || !readingStats.value) return null
    return estimateRemainingTime(
      currentSpineIndex.value,
      totalSpineItems.value,
      readingStats.value.chapterCharCounts,
      readingStats.value.averageSpeed
    )
  })

  const remainingTimeText = computed(() => {
    if (remainingTimeMinutes.value === null) return ''
    return formatReadingTime(remainingTimeMinutes.value)
  })

  async function importBook(file: File): Promise<{ id: string; isDuplicate: boolean; error?: string } | null> {
    isLoading.value = true
    error.value = null

    try {
      const parser = new EpubParser()
      const book = await parser.parse(file)
      
      const id = generateBookId(book)
      
      const existingBook = await db.get('books', id)
      if (existingBook) {
        return { id, isDuplicate: true }
      }
      
      await saveBookToLibrary(file, book, id)
      
      return { id, isDuplicate: false }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '导入书籍失败'
      console.error('Failed to import book:', e)
      if (errorMessage.includes('zip') || errorMessage.includes('parse') || errorMessage.includes('Invalid') || errorMessage.includes(' corrupted') || errorMessage.includes('EPub') || errorMessage.includes('XML')) {
        return { id: '', isDuplicate: false, error: 'file_corrupted' }
      }
      return { id: '', isDuplicate: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  async function loadBook(file: File, existingId?: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const parser = new EpubParser()
      const book = await parser.parse(file)
      
      currentBook.value = book
      currentSpineIndex.value = 0

      styleInjector.inject(settings.value)

      if (existingId) {
        bookId.value = existingId
      } else {
        const id = generateBookId(book)
        bookId.value = id
        await saveBookToLibrary(file, book, id)
      }
      
      await loadReadingStats()
      startChapterTracking()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载书籍失败'
      console.error('Failed to load book:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function loadBookFromLibrary(id: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const bookData = await db.get('books', id)
      if (!bookData) {
        throw new Error('书籍不存在')
      }

      const file = new File([bookData.data], `${bookData.title}.epub`, {
        type: 'application/epub+zip'
      })

      await loadBook(file, id)

      const savedProgress = await db.get('progress', id)
      if (savedProgress) {
        currentSpineIndex.value = savedProgress.spineIndex
      }
      
      await loadReadingStats()
      startChapterTracking()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载书籍失败'
      console.error('Failed to load book from library:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function saveBookToLibrary(file: File, book: EpubBook, id: string): Promise<void> {
    const buffer = await file.arrayBuffer()

    let filePath = ''
    if ((file as any).path) {
      filePath = (file as any).path
    }

    await db.put('books', {
      id,
      title: book.metadata.title,
      author: book.metadata.author,
      cover: book.metadata.cover,
      data: buffer,
      metadata: book.metadata as unknown as Record<string, unknown>,
      addedAt: Date.now(),
      filePath,
      isMissing: false
    })
  }

  async function saveProgress(): Promise<void> {
    if (!bookId.value || !currentBook.value) return

    await db.put('progress', {
      bookId: bookId.value,
      spineIndex: currentSpineIndex.value,
      progress: progress.value,
      updatedAt: Date.now()
    })
  }

  async function loadReadingStats(): Promise<void> {
    if (!bookId.value) return
    
    try {
      const stats = await db.get('readingStats', bookId.value)
      if (stats) {
        readingStats.value = stats
      } else {
        readingStats.value = createEmptyReadingStats(bookId.value)
      }
    } catch (e) {
      console.error('Failed to load reading stats:', e)
      readingStats.value = createEmptyReadingStats(bookId.value!)
    }
  }

  async function saveReadingStats(): Promise<void> {
    if (!readingStats.value || !bookId.value) return
    
    try {
      await db.put('readingStats', readingStats.value)
    } catch (e) {
      console.error('Failed to save reading stats:', e)
    }
  }

  function startChapterTracking(): void {
    chapterStartTime.value = Date.now()
    lastSpineIndex.value = currentSpineIndex.value
  }

  async function recordChapterCompletion(fromIndex: number, toIndex: number): Promise<void> {
    if (!currentBook.value || !readingStats.value) return
    
    const endTime = Date.now()
    const durationMs = endTime - chapterStartTime.value
    
    if (durationMs >= 5000 && fromIndex >= 0) {
      const charCount = await getChapterCharCount(fromIndex)
      
      if (charCount > 0) {
        const speed = calculateReadingSpeed(charCount, durationMs)
        
        if (speed > 0) {
          const record: ChapterReadingRecord = {
            spineIndex: fromIndex,
            charCount,
            startTime: chapterStartTime.value,
            endTime,
            durationMs,
            charsPerMinute: speed
          }
          
          readingStats.value = addReadingRecord(readingStats.value, record)
          readingStats.value = updateChapterCharCount(readingStats.value, fromIndex, charCount)
          
          await saveReadingStats()
        }
      }
    }
    
    chapterStartTime.value = Date.now()
    lastSpineIndex.value = toIndex
  }

  async function getChapterCharCount(spineIndex: number): Promise<number> {
    if (!currentBook.value) return 0
    
    if (readingStats.value?.chapterCharCounts[spineIndex]) {
      return readingStats.value.chapterCharCounts[spineIndex]
    }
    
    const spineItem = currentBook.value.spine[spineIndex]
    if (!spineItem) return 0
    
    const resource = currentBook.value.resources.get(spineItem.href)
    if (!resource) return 0
    
    let content: string
    if (typeof resource.content === 'string') {
      content = resource.content
    } else {
      content = new TextDecoder('utf-8').decode(resource.content)
    }
    
    return countChars(content)
  }

  function goToChapter(index: number): void {
    if (!currentBook.value) return
    if (index >= 0 && index < totalSpineItems.value) {
      const fromIndex = currentSpineIndex.value
      currentSpineIndex.value = index
      saveProgress()
      if (fromIndex !== index) {
        recordChapterCompletion(fromIndex, index)
      }
    }
  }

  function nextPage(): void {
    goToChapter(currentSpineIndex.value + 1)
  }

  function prevPage(): void {
    goToChapter(currentSpineIndex.value - 1)
  }

  function updateSettings(newSettings: Partial<ReaderSettings>): void {
    settings.value = { ...settings.value, ...newSettings }
    saveSettings(settings.value)
    styleInjector.update(settings.value)
  }

  function closeBook(): void {
    saveProgress()
    if (readingStats.value) {
      saveReadingStats()
    }
    currentBook.value = null
    bookId.value = null
    currentSpineIndex.value = 0
    readingStats.value = null
    chapterStartTime.value = 0
    lastSpineIndex.value = -1
    styleInjector.remove()
  }

  function generateBookId(book: EpubBook): string {
    const identifier = book.metadata.identifier || book.metadata.title
    const hash = simpleHash(identifier + book.metadata.author)
    return `book-${hash}`
  }

  function simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  async function checkBookAvailability(): Promise<{ id: string; title: string; isMissing: boolean }[]> {
    const books = await db.getAll('books')
    const results: { id: string; title: string; isMissing: boolean }[] = []
    
    for (const book of books) {
      let isMissing = false
      if (book.filePath) {
        try {
          const response = await fetch(`file://${book.filePath}`, { method: 'HEAD' })
          isMissing = !response.ok
        } catch {
          isMissing = true
        }
      }
      
      if (book.isMissing !== isMissing) {
        await db.put('books', { ...book, isMissing })
      }
      
      results.push({ id: book.id, title: book.title, isMissing })
    }
    
    return results.filter(r => r.isMissing)
  }

  return {
    currentBook,
    bookId,
    currentSpineIndex,
    isLoading,
    error,
    settings,
    totalSpineItems,
    currentChapter,
    progress,
    location,
    readingStats,
    remainingTimeMinutes,
    remainingTimeText,
    importBook,
    loadBook,
    loadBookFromLibrary,
    checkBookAvailability,
    saveProgress,
    loadReadingStats,
    saveReadingStats,
    startChapterTracking,
    recordChapterCompletion,
    getChapterCharCount,
    goToChapter,
    nextPage,
    prevPage,
    updateSettings,
    closeBook
  }
})
