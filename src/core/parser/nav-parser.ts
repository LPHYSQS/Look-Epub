import type { EpubTocItem } from '@/types'

export class NavParser {
  parse(navContent: string, rootPath: string): EpubTocItem[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(navContent, 'application/xhtml+xml')
    
    const navEl = doc.querySelector('nav[epub\\:type="toc"], nav#toc')
    if (!navEl) {
      return []
    }

    const list = navEl.querySelector('ol')
    if (!list) {
      return []
    }

    return this.parseList(list, rootPath, 0)
  }

  private parseList(list: Element, rootPath: string, startOrder: number): EpubTocItem[] {
    const items: EpubTocItem[] = []
    const listItems = list.querySelectorAll(':scope > li')

    listItems.forEach((li, index) => {
      const link = li.querySelector(':scope > a')
      if (!link) return

      const id = link.getAttribute('id') || `nav-${startOrder}-${index}`
      const title = link.textContent?.trim() || ''
      let href = link.getAttribute('href') || ''

      if (rootPath && !href.startsWith(rootPath)) {
        href = `${rootPath}/${href}`
      }

      const item: EpubTocItem = {
        id,
        title,
        href: this.cleanHref(href),
        order: startOrder + index
      }

      const subList = li.querySelector(':scope > ol')
      if (subList) {
        item.children = this.parseList(subList, rootPath, 0)
      }

      items.push(item)
    })

    return items
  }

  private cleanHref(href: string): string {
    const hashIndex = href.indexOf('#')
    return hashIndex > -1 ? href.substring(0, hashIndex) : href
  }
}
