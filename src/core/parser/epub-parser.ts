import type { EpubBook, EpubManifestItem, EpubResource, EpubTocItem } from '@/types'
import { ZipExtractor } from './zip-extractor'
import { OpfParser } from './opf-parser'
import { NcxParser } from './ncx-parser'
import { NavParser } from './nav-parser'

export class EpubParser {
  private zipExtractor: ZipExtractor
  private opfParser: OpfParser
  private ncxParser: NcxParser
  private navParser: NavParser

  constructor() {
    this.zipExtractor = new ZipExtractor()
    this.opfParser = new OpfParser()
    this.ncxParser = new NcxParser()
    this.navParser = new NavParser()
  }

  async parse(file: File): Promise<EpubBook> {
    await this.zipExtractor.extract(file)
    
    const containerXml = this.zipExtractor.getTextContent('META-INF/container.xml')
    if (!containerXml) {
      throw new Error('无效的EPUB文件: 缺少container.xml')
    }

    const opfPath = this.parseContainer(containerXml)
    
    const opfContent = this.zipExtractor.getTextContent(opfPath)
    if (!opfContent) {
      throw new Error('无效的EPUB文件: 无法读取OPF文件')
    }

    const { metadata, manifest, spine, rootPath } = this.opfParser.parse(opfContent, opfPath)
    
    const toc = await this.parseToc(rootPath)
    
    const resources = await this.extractResources(manifest)

    const coverUrl = this.findCover(metadata.cover || '', manifest, resources)

    return {
      metadata: { ...metadata, cover: coverUrl },
      manifest,
      spine,
      toc,
      resources,
      rootUrl: '',
      opfPath
    }
  }

  private parseContainer(containerXml: string): string {
    const parser = new DOMParser()
    const doc = parser.parseFromString(containerXml, 'application/xml')
    const rootfile = doc.querySelector('rootfile')
    return rootfile?.getAttribute('full-path') || 'OEBPS/content.opf'
  }

  private async parseToc(rootPath: string): Promise<EpubTocItem[]> {
    const ncxPath = `${rootPath}/toc.ncx`
    const navPath = `${rootPath}/nav.xhtml`

    const ncxContent = this.zipExtractor.getTextContent(ncxPath)
    if (ncxContent) {
      return this.ncxParser.parse(ncxContent, rootPath)
    }

    const navContent = this.zipExtractor.getTextContent(navPath)
    if (navContent) {
      return this.navParser.parse(navContent, rootPath)
    }

    return []
  }

  private async extractResources(
    manifest: Map<string, EpubManifestItem>
  ): Promise<Map<string, EpubResource>> {
    const resources = new Map<string, EpubResource>()
    const allZipPaths = this.zipExtractor.getAllPaths()

    for (const [, item] of manifest) {
      let content = this.zipExtractor.getContent(item.href)
      
      if (!content) {
        const normalizedHref = item.href.replace(/\\/g, '/').replace(/\/+/g, '/')
        content = this.zipExtractor.getContent(normalizedHref)
      }
      
      if (!content) {
        const fileName = item.href.split('/').pop() || ''
        for (const zipPath of allZipPaths) {
          if (zipPath.endsWith('/' + fileName) || zipPath === fileName) {
            content = this.zipExtractor.getContent(zipPath)
            if (content) break
          }
        }
      }
      
      if (content) {
        const arrayBuffer = new Uint8Array(content).buffer as ArrayBuffer
        const blob = new Blob([arrayBuffer], { type: item.mediaType })
        const url = URL.createObjectURL(blob)
        
        resources.set(item.href, {
          href: item.href,
          content: arrayBuffer,
          mediaType: item.mediaType,
          url
        })
      }
    }

    return resources
  }

  private findCover(
    coverId: string,
    manifest: Map<string, EpubManifestItem>,
    resources: Map<string, EpubResource>
  ): string | undefined {
    let coverHref: string | undefined

    if (coverId) {
      for (const [id, item] of manifest) {
        if (id === coverId) {
          coverHref = item.href
          break
        }
      }
    }

    if (!coverHref) {
      for (const [, item] of manifest) {
        if (item.properties?.includes('cover-image')) {
          coverHref = item.href
          break
        }
      }
    }

    if (!coverHref) {
      for (const [href] of resources) {
        const lowerHref = href.toLowerCase()
        if (lowerHref.includes('cover') && 
            (lowerHref.endsWith('.jpg') || lowerHref.endsWith('.jpeg') || 
             lowerHref.endsWith('.png') || lowerHref.endsWith('.gif') ||
             lowerHref.endsWith('.webp') || lowerHref.endsWith('.svg'))) {
          coverHref = href
          break
        }
      }
    }

    if (!coverHref) {
      for (const [href] of manifest) {
        const lowerHref = href.toLowerCase()
        if (lowerHref.includes('cover') && 
            (lowerHref.endsWith('.jpg') || lowerHref.endsWith('.jpeg') || 
             lowerHref.endsWith('.png') || lowerHref.endsWith('.gif') ||
             lowerHref.endsWith('.webp') || lowerHref.endsWith('.svg'))) {
          coverHref = href
          break
        }
      }
    }

    if (coverHref) {
      const resource = resources.get(coverHref)
      if (resource && resource.content instanceof ArrayBuffer) {
        return this.convertToDataUrl(resource.content, resource.mediaType)
      }
    }

    return undefined
  }

  getContent(href: string): string {
    return this.zipExtractor.getTextContent(href) || ''
  }

  private convertToDataUrl(content: ArrayBuffer, mediaType?: string): string {
    const bytes = new Uint8Array(content)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    const mimeType = mediaType || 'image/jpeg'
    return `data:${mimeType};base64,${base64}`
  }
}
