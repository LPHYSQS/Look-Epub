export interface EpubMetadata {
  title: string
  author: string
  publisher: string
  language: string
  identifier: string
  description?: string
  cover?: string
  publishedDate?: string
  modifiedDate?: string
}

export interface EpubTocItem {
  id: string
  title: string
  href: string
  order: number
  children?: EpubTocItem[]
}

export interface EpubSpineItem {
  id: string
  href: string
  linear: boolean
  order: number
}

export interface EpubManifestItem {
  id: string
  href: string
  mediaType: string
  properties?: string[]
}

export interface EpubResource {
  href: string
  content: ArrayBuffer | string
  mediaType: string
  url?: string
}

export interface EpubBook {
  metadata: EpubMetadata
  manifest: Map<string, EpubManifestItem>
  spine: EpubSpineItem[]
  toc: EpubTocItem[]
  resources: Map<string, EpubResource>
  rootUrl: string
  opfPath: string
}

export interface EpubLocation {
  spineIndex: number
  chapterHref: string
  cfi?: string
  progress: number
}

export interface EpubBookmark {
  id: string
  bookId: string
  title: string
  location: EpubLocation
  createdAt: number
}

export interface EpubHighlight {
  id: string
  bookId: string
  spineIndex: number
  cfiRange: string
  text: string
  color: string
  note?: string
  createdAt: number
}
