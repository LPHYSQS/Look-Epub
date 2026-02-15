import type { EpubMetadata, EpubManifestItem, EpubSpineItem } from '@/types'

export interface OpfData {
  metadata: EpubMetadata
  manifest: Map<string, EpubManifestItem>
  spine: EpubSpineItem[]
  rootPath: string
}

export class OpfParser {
  parse(opfContent: string, opfPath: string): OpfData {
    const parser = new DOMParser()
    const doc = parser.parseFromString(opfContent, 'application/xml')
    
    const rootPath = opfPath.substring(0, opfPath.lastIndexOf('/'))
    
    const metadata = this.parseMetadata(doc)
    const manifest = this.parseManifest(doc, rootPath)
    const spine = this.parseSpine(doc, manifest)

    return { metadata, manifest, spine, rootPath }
  }

  private parseMetadata(doc: Document): EpubMetadata {
    const metadataEl = doc.querySelector('metadata')
    if (!metadataEl) {
      return this.getDefaultMetadata()
    }

    const getDcText = (tag: string): string => {
      const el = metadataEl.querySelector(tag) || 
                 metadataEl.querySelector(`dc\\:${tag}`)
      return el?.textContent?.trim() || ''
    }

    const getMeta = (name: string): string => {
      const el = metadataEl.querySelector(`meta[name="${name}"]`)
      return el?.getAttribute('content') || ''
    }

    return {
      title: getDcText('title') || '未知标题',
      author: getDcText('creator') || getDcText('author') || '未知作者',
      publisher: getDcText('publisher') || '',
      language: getDcText('language') || 'zh',
      identifier: getDcText('identifier') || '',
      description: getDcText('description') || '',
      publishedDate: getDcText('date') || '',
      modifiedDate: getMeta('dcterms:modified') || getMeta('modified'),
      cover: this.findCoverId(metadataEl)
    }
  }

  private findCoverId(metadataEl: Element): string {
    const coverMeta = metadataEl.querySelector('meta[name="cover"]')
    return coverMeta?.getAttribute('content') || ''
  }

  private parseManifest(doc: Document, rootPath: string): Map<string, EpubManifestItem> {
    const manifest = new Map<string, EpubManifestItem>()
    const items = doc.querySelectorAll('manifest > item')

    items.forEach((item, index) => {
      const id = item.getAttribute('id') || `item-${index}`
      let href = item.getAttribute('href') || ''
      const mediaType = item.getAttribute('media-type') || ''
      const properties = item.getAttribute('properties')?.split(' ') || []

      if (rootPath) {
        href = `${rootPath}/${href}`
      }

      manifest.set(id, { id, href, mediaType, properties })
    })

    return manifest
  }

  private parseSpine(doc: Document, manifest: Map<string, EpubManifestItem>): EpubSpineItem[] {
    const spine: EpubSpineItem[] = []
    const spineItems = doc.querySelectorAll('spine > itemref')

    spineItems.forEach((item, index) => {
      const idref = item.getAttribute('idref') || ''
      const linear = item.getAttribute('linear') !== 'no'
      const manifestItem = manifest.get(idref)

      if (manifestItem) {
        spine.push({
          id: idref,
          href: manifestItem.href,
          linear,
          order: index
        })
      }
    })

    return spine
  }

  private getDefaultMetadata(): EpubMetadata {
    return {
      title: '未知标题',
      author: '未知作者',
      publisher: '',
      language: 'zh',
      identifier: ''
    }
  }
}
