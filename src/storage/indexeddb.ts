const DB_NAME = 'look-epub-db'
const DB_VERSION = 4

interface DBSchema {
  books: {
    key: string
    value: {
      id: string
      title: string
      author: string
      cover?: string
      customTitle?: string
      customAuthor?: string
      customCover?: string
      data: ArrayBuffer
      metadata: Record<string, unknown>
      addedAt: number
      lastReadAt?: number
      filePath?: string
      isMissing?: boolean
    }
  }
  progress: {
    key: string
    value: {
      bookId: string
      spineIndex: number
      progress: number
      updatedAt: number
    }
  }
  bookmarks: {
    key: string
    value: {
      id: string
      bookId: string
      title: string
      spineIndex: number
      progress: number
      createdAt: number
    }
  }
  readingStats: {
    key: string
    value: {
      bookId: string
      records: Array<{
        spineIndex: number
        charCount: number
        startTime: number
        endTime: number
        durationMs: number
        charsPerMinute: number
      }>
      totalCharsRead: number
      totalDurationMs: number
      averageSpeed: number
      lastUpdatedAt: number
      chapterCharCounts: Record<number, number>
    }
  }
}

type StoreNames = keyof DBSchema

class IndexedDBManager {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains('books')) {
          const booksStore = db.createObjectStore('books', { keyPath: 'id' })
          booksStore.createIndex('filePath', 'filePath')
        }

        if (!db.objectStoreNames.contains('progress')) {
          const progressStore = db.createObjectStore('progress', { keyPath: 'bookId' })
          progressStore.createIndex('updatedAt', 'updatedAt')
        }

        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' })
          bookmarkStore.createIndex('bookId', 'bookId')
        }

        if (!db.objectStoreNames.contains('readingStats')) {
          db.createObjectStore('readingStats', { keyPath: 'bookId' })
        }
      }
    })
  }

  async get<K extends StoreNames>(
    storeName: K,
    key: string
  ): Promise<DBSchema[K]['value'] | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getAll<K extends StoreNames>(
    storeName: K
  ): Promise<DBSchema[K]['value'][]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async put<K extends StoreNames>(
    storeName: K,
    value: DBSchema[K]['value']
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(value)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async delete<K extends StoreNames>(
    storeName: K,
    key: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getByIndex<K extends StoreNames>(
    storeName: K,
    indexName: string,
    value: IDBValidKey
  ): Promise<DBSchema[K]['value'][]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }
}

export const db = new IndexedDBManager()
