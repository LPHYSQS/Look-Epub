import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/storage'

interface BookInfo {
  id: string
  title: string
  author: string
  cover?: string
  customTitle?: string
  customAuthor?: string
  customCover?: string
  addedAt: number
  lastReadAt?: number
  readProgress?: number
  isMissing?: boolean
}

export const useLibraryStore = defineStore('library', () => {
  const books = ref<BookInfo[]>([])
  const isLoading = ref(false)

  const sortedBooks = computed(() => {
    return [...books.value].sort((a, b) => {
      const aTime = a.lastReadAt || a.addedAt
      const bTime = b.lastReadAt || b.addedAt
      return bTime - aTime
    })
  })

  async function loadLibrary(): Promise<void> {
    isLoading.value = true
    try {
      const storedBooks = await db.getAll('books')
      const storedProgress = await db.getAll('progress')
      
      const progressMap = new Map(
        storedProgress.map(p => [p.bookId, p])
      )

      books.value = storedBooks.map(book => {
        const progress = progressMap.get(book.id)
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          cover: book.cover,
          customTitle: book.customTitle,
          customAuthor: book.customAuthor,
          customCover: book.customCover,
          addedAt: book.addedAt,
          lastReadAt: progress?.updatedAt,
          readProgress: progress?.progress,
          isMissing: book.isMissing
        }
      })
    } catch (e) {
      console.error('Failed to load library:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function deleteBook(id: string): Promise<void> {
    try {
      await db.delete('books', id)
      await db.delete('progress', id)
      books.value = books.value.filter(b => b.id !== id)
    } catch (e) {
      console.error('Failed to delete book:', e)
    }
  }

  async function deleteBooks(ids: string[]): Promise<void> {
    try {
      for (const id of ids) {
        await db.delete('books', id)
        await db.delete('progress', id)
      }
      books.value = books.value.filter(b => !ids.includes(b.id))
    } catch (e) {
      console.error('Failed to delete books:', e)
    }
  }

  async function updateBook(id: string, updates: Partial<Pick<BookInfo, 'customTitle' | 'customAuthor' | 'customCover'>>): Promise<void> {
    try {
      const book = books.value.find(b => b.id === id)
      if (!book) {
        console.error('Book not found in memory:', id)
        return
      }

      const storedBook = await db.get('books', id)

      if (storedBook) {
        const { data, metadata, ...restStored } = storedBook as any
        await db.put('books', {
          ...restStored,
          ...updates
        } as any)
      }

      const index = books.value.findIndex(b => b.id === id)
      if (index !== -1) {
        books.value[index] = { ...books.value[index], ...updates }
      }
    } catch (e) {
      console.error('Failed to update book:', e)
    }
  }

  return {
    books,
    isLoading,
    sortedBooks,
    loadLibrary,
    deleteBook,
    deleteBooks,
    updateBook
  }
})
