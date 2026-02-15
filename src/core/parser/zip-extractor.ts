import { unzipSync } from 'fflate'

export interface ZipEntry {
  content: Uint8Array
  isDirectory: boolean
}

export class ZipExtractor {
  private entries: Map<string, ZipEntry> = new Map()

  async extract(file: File): Promise<Map<string, ZipEntry>> {
    const buffer = await file.arrayBuffer()
    const unzipped = unzipSync(new Uint8Array(buffer))
    
    for (const [path, data] of Object.entries(unzipped)) {
      const normalizedPath = this.normalizePath(path)
      this.entries.set(normalizedPath, {
        content: data,
        isDirectory: path.endsWith('/')
      })
    }
    
    return this.entries
  }

  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/$/, '')
  }

  getEntry(path: string): ZipEntry | undefined {
    const normalizedPath = this.normalizePath(path)
    return this.entries.get(normalizedPath)
  }

  getContent(path: string): Uint8Array | undefined {
    const normalizedPath = this.normalizePath(path)
    const entry = this.entries.get(normalizedPath)
    return entry?.content
  }

  getTextContent(path: string): string | undefined {
    const content = this.getContent(path)
    if (!content) return undefined
    return new TextDecoder('utf-8').decode(content)
  }

  getAllPaths(): string[] {
    return Array.from(this.entries.keys())
  }

  has(path: string): boolean {
    return this.entries.has(this.normalizePath(path))
  }
}
