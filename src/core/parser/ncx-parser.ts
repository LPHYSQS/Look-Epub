import type { EpubTocItem } from '@/types'

export class NcxParser {
  parse(ncxContent: string, rootPath: string): EpubTocItem[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(ncxContent, 'application/xml')
    
    const navPoints = doc.querySelectorAll('navMap > navPoint')
    const toc: EpubTocItem[] = []

    navPoints.forEach((navPoint, index) => {
      const item = this.parseNavPoint(navPoint, rootPath, index)
      if (item) {
        toc.push(item)
      }
    })

    return toc
  }

  private parseNavPoint(navPoint: Element, rootPath: string, order: number): EpubTocItem | null {
    const id = navPoint.getAttribute('id') || `nav-${order}`
    const labelEl = navPoint.querySelector('navLabel > text')
    const contentEl = navPoint.querySelector('content')
    
    const title = labelEl?.textContent?.trim() || ''
    let href = contentEl?.getAttribute('src') || ''

    if (rootPath && !href.startsWith(rootPath)) {
      href = `${rootPath}/${href}`
    }

    const item: EpubTocItem = {
      id,
      title,
      href: this.cleanHref(href),
      order
    }

    const childNavPoints = navPoint.querySelectorAll(':scope > navPoint')
    if (childNavPoints.length > 0) {
      item.children = []
      childNavPoints.forEach((child, childIndex) => {
        const childItem = this.parseNavPoint(child, rootPath, childIndex)
        if (childItem) {
          item.children!.push(childItem)
        }
      })
    }

    return item
  }

  private cleanHref(href: string): string {
    const hashIndex = href.indexOf('#')
    return hashIndex > -1 ? href.substring(0, hashIndex) : href
  }
}
