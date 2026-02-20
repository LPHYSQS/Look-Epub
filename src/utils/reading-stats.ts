import type { ReadingStats, ChapterReadingRecord } from '@/types'

const DEFAULT_READING_SPEED = 400
const MIN_READING_TIME_MS = 5000
const MAX_RECORDS_TO_KEEP = 100
const RECENT_RECORDS_WEIGHT = 0.7

export function countChars(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, '')
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const otherChars = text.replace(/[\u4e00-\u9fff]/g, '').length
  return chineseChars + Math.ceil(otherChars / 2)
}

export function calculateReadingSpeed(
  charCount: number,
  durationMs: number
): number {
  if (durationMs < MIN_READING_TIME_MS) return 0
  const durationMinutes = durationMs / 60000
  if (durationMinutes <= 0) return 0
  return Math.round(charCount / durationMinutes)
}

export function getWeightedAverageSpeed(records: ChapterReadingRecord[]): number {
  if (records.length === 0) return DEFAULT_READING_SPEED
  
  const validRecords = records.filter(r => r.charsPerMinute > 0)
  if (validRecords.length === 0) return DEFAULT_READING_SPEED
  
  const recentCount = Math.min(10, validRecords.length)
  const recentRecords = validRecords.slice(-recentCount)
  const olderRecords = validRecords.slice(0, -recentCount)
  
  let weightedSum = 0
  let totalWeight = 0
  
  if (recentRecords.length > 0) {
    const recentAvg = recentRecords.reduce((sum, r) => sum + r.charsPerMinute, 0) / recentRecords.length
    weightedSum += recentAvg * RECENT_RECORDS_WEIGHT
    totalWeight += RECENT_RECORDS_WEIGHT
  }
  
  if (olderRecords.length > 0) {
    const olderAvg = olderRecords.reduce((sum, r) => sum + r.charsPerMinute, 0) / olderRecords.length
    weightedSum += olderAvg * (1 - RECENT_RECORDS_WEIGHT)
    totalWeight += (1 - RECENT_RECORDS_WEIGHT)
  } else if (recentRecords.length > 0) {
    weightedSum = recentRecords.reduce((sum, r) => sum + r.charsPerMinute, 0)
    totalWeight = recentRecords.length
  }
  
  return Math.round(weightedSum / totalWeight)
}

export function estimateRemainingTime(
  currentSpineIndex: number,
  totalSpineItems: number,
  chapterCharCounts: Record<number, number>,
  averageSpeed: number,
  currentChapterProgress: number = 0
): number {
  if (averageSpeed <= 0) averageSpeed = DEFAULT_READING_SPEED
  
  let remainingChars = 0
  
  if (chapterCharCounts[currentSpineIndex]) {
    const currentChapterChars = chapterCharCounts[currentSpineIndex]
    remainingChars += currentChapterChars * (1 - currentChapterProgress)
  }
  
  for (let i = currentSpineIndex + 1; i < totalSpineItems; i++) {
    if (chapterCharCounts[i]) {
      remainingChars += chapterCharCounts[i]
    } else {
      const knownChars = Object.values(chapterCharCounts)
      if (knownChars.length > 0) {
        const avgCharsPerChapter = knownChars.reduce((a, b) => a + b, 0) / knownChars.length
        remainingChars += avgCharsPerChapter
      } else {
        remainingChars += 3000
      }
    }
  }
  
  const remainingMinutes = remainingChars / averageSpeed
  return Math.round(remainingMinutes)
}

export function formatReadingTime(minutes: number): string {
  if (minutes <= 0) return '即将读完'
  if (minutes < 1) return '约1分钟'
  if (minutes < 60) return `约${minutes}分钟`
  
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainHours = hours % 24
    if (remainHours === 0) {
      return `约${days}天`
    }
    return `约${days}天${remainHours}小时`
  }
  
  if (mins === 0) {
    return `约${hours}小时`
  }
  return `约${hours}小时${mins}分钟`
}

export function createEmptyReadingStats(bookId: string): ReadingStats {
  return {
    bookId,
    records: [],
    totalCharsRead: 0,
    totalDurationMs: 0,
    averageSpeed: DEFAULT_READING_SPEED,
    lastUpdatedAt: Date.now(),
    chapterCharCounts: {}
  }
}

export function addReadingRecord(
  stats: ReadingStats,
  record: ChapterReadingRecord
): ReadingStats {
  const newRecords = [...stats.records, record]
  if (newRecords.length > MAX_RECORDS_TO_KEEP) {
    newRecords.splice(0, newRecords.length - MAX_RECORDS_TO_KEEP)
  }
  
  const totalCharsRead = stats.totalCharsRead + record.charCount
  const totalDurationMs = stats.totalDurationMs + record.durationMs
  const averageSpeed = getWeightedAverageSpeed(newRecords)
  
  return {
    ...stats,
    records: newRecords,
    totalCharsRead,
    totalDurationMs,
    averageSpeed,
    lastUpdatedAt: Date.now()
  }
}

export function updateChapterCharCount(
  stats: ReadingStats,
  spineIndex: number,
  charCount: number
): ReadingStats {
  return {
    ...stats,
    chapterCharCounts: {
      ...stats.chapterCharCounts,
      [spineIndex]: charCount
    },
    lastUpdatedAt: Date.now()
  }
}
