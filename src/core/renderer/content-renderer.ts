import type { EpubBook } from '@/types'

export class ContentRenderer {
  private book: EpubBook
  private currentChapterHref: string = ''

  constructor(book: EpubBook, _container: HTMLElement) {
    this.book = book
  }

  render(spineIndex: number): string {
    const spineItem = this.book.spine[spineIndex]
    if (!spineItem) {
      return this.renderError('章节不存在')
    }

    this.currentChapterHref = spineItem.href

    const resource = this.book.resources.get(spineItem.href)
    if (!resource) {
      return this.renderError('无法加载章节内容')
    }

    let content: string
    if (typeof resource.content === 'string') {
      content = resource.content
    } else {
      content = new TextDecoder('utf-8').decode(resource.content)
    }

    return this.processContent(content)
  }

  private processContent(content: string): string {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'application/xhtml+xml')

    this.processImages(doc)
    this.processLinks(doc)
    this.processStyles(doc)

    const body = doc.body
    return body.innerHTML
  }

  private processImages(doc: Document): void {
    const images = doc.querySelectorAll('img')
    images.forEach((img) => {
      const src = img.getAttribute('src')
      if (src) {
        const resourceUrl = this.findResourceUrl(src)
        if (resourceUrl) {
          img.setAttribute('src', resourceUrl)
        }
      }
    })

    const svgImages = doc.querySelectorAll('image')
    svgImages.forEach((img) => {
      const href = img.getAttribute('href') || img.getAttribute('xlink:href')
      if (href) {
        const resourceUrl = this.findResourceUrl(href)
        if (resourceUrl) {
          img.setAttribute('href', resourceUrl)
        }
      }
    })

    const body = doc.body
    if (body) {
      const bgImage = body.style.backgroundImage
      if (bgImage && bgImage !== 'none') {
        const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/)
        if (urlMatch && urlMatch[1]) {
          const resourceUrl = this.findResourceUrl(urlMatch[1])
          if (resourceUrl) {
            body.style.backgroundImage = `url("${resourceUrl}")`
          }
        }
      }
    }
  }

  private findResourceUrl(src: string): string | null {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src
    }

    const allPathsToTry = this.generateAllPossiblePaths(src)

    for (const path of allPathsToTry) {
      const resource = this.book.resources.get(path)
      if (resource?.url) {
        return resource.url
      }
    }

    for (const [href, resource] of this.book.resources) {
      for (const path of allPathsToTry) {
        if (this.pathsMatch(href, path)) {
          return resource.url || null
        }
      }
    }

    return null
  }

  private generateAllPossiblePaths(src: string): string[] {
    const paths: string[] = []
    
    let cleanSrc = src
    try {
      cleanSrc = decodeURIComponent(src)
    } catch {
      // ignore
    }

    const normalizedSrc = this.normalizePath(cleanSrc)
    paths.push(normalizedSrc)

    const chapterDir = this.currentChapterHref.substring(0, this.currentChapterHref.lastIndexOf('/'))
    const opfDir = this.book.opfPath.substring(0, this.book.opfPath.lastIndexOf('/'))

    if (chapterDir) {
      const resolved = this.resolveRelativePath(chapterDir, normalizedSrc)
      if (resolved) paths.push(resolved)
    }

    if (opfDir) {
      paths.push(`${opfDir}/${normalizedSrc}`)
      
      const srcWithoutLeadingDots = normalizedSrc.replace(/^\.?\//, '')
      paths.push(`${opfDir}/${srcWithoutLeadingDots}`)
    }

    const srcParts = normalizedSrc.split('/')
    const fileName = srcParts[srcParts.length - 1]
    if (fileName) {
      paths.push(fileName)
      
      if (opfDir) {
        paths.push(`${opfDir}/Images/${fileName}`)
        paths.push(`${opfDir}/images/${fileName}`)
        paths.push(`${opfDir}/OEBPS/Images/${fileName}`)
        paths.push(`${opfDir}/OPS/Images/${fileName}`)
      }
    }

    const uniquePaths = [...new Set(paths)]
    return uniquePaths
  }

  private pathsMatch(href: string, targetPath: string): boolean {
    const normalizedHref = this.normalizePath(href)
    const normalizedTarget = this.normalizePath(targetPath)

    if (normalizedHref === normalizedTarget) return true
    if (normalizedHref.endsWith('/' + normalizedTarget)) return true
    if (normalizedTarget.endsWith('/' + normalizedHref)) return true

    const hrefFileName = normalizedHref.split('/').pop()?.toLowerCase()
    const targetFileName = normalizedTarget.split('/').pop()?.toLowerCase()
    if (hrefFileName && targetFileName && hrefFileName === targetFileName) return true

    return false
  }

  private resolveRelativePath(baseDir: string, relativePath: string): string | null {
    const parts = baseDir.split('/')
    const relParts = relativePath.split('/')

    for (const part of relParts) {
      if (part === '..') {
        parts.pop()
      } else if (part !== '.' && part !== '') {
        parts.push(part)
      }
    }

    return parts.join('/')
  }

  private normalizePath(path: string): string {
    return path
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/\/\.\//g, '/')
      .replace(/^\.\//, '')
  }

  private processLinks(doc: Document): void {
    const links = doc.querySelectorAll('a[href]')
    links.forEach((link) => {
      const href = link.getAttribute('href')
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        link.setAttribute('data-href', href)
        link.setAttribute('href', 'javascript:void(0)')
      }
    })
  }

  private processStyles(doc: Document): void {
    const links = doc.querySelectorAll('link[rel="stylesheet"]')
    links.forEach((link) => {
      const href = link.getAttribute('href')
      if (href) {
        const resourceUrl = this.findResourceUrl(href)
        if (resourceUrl) {
          link.setAttribute('href', resourceUrl)
        }
      }
    })
  }

  private renderError(message: string): string {
    return `<div class="epub-error">${message}</div>`
  }
}
