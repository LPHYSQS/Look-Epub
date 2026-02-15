export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  fontFamily: string
  theme: 'light' | 'dark' | 'sepia'
  pageWidth: number
  sideMargin: number
}

export interface ReaderState {
  currentBook: string | null
  currentLocation: EpubLocation | null
  settings: ReaderSettings
  isLoading: boolean
  error: string | null
}

export interface PageData {
  spineIndex: number
  chapterTitle: string
  content: string
  totalPages: number
  currentPage: number
}

import type { EpubLocation } from './epub'

export const defaultSettings: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  theme: 'light',
  pageWidth: 800,
  sideMargin: 40
}
