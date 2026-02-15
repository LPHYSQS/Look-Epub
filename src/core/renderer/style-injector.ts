import type { ReaderSettings } from '@/types'

export class StyleInjector {
  private styleId = 'epub-reader-styles'

  inject(settings: ReaderSettings): void {
    this.removeExisting()
    
    const style = document.createElement('style')
    style.id = this.styleId
    style.textContent = this.generateStyles(settings)
    document.head.appendChild(style)
  }

  update(settings: ReaderSettings): void {
    this.inject(settings)
  }

  remove(): void {
    this.removeExisting()
  }

  private removeExisting(): void {
    const existing = document.getElementById(this.styleId)
    if (existing) {
      existing.remove()
    }
  }

  private generateStyles(settings: ReaderSettings): string {
    const themeColors = this.getThemeColors(settings.theme)

    return `
      :root {
        --reader-font-size: ${settings.fontSize}px;
        --reader-line-height: ${settings.lineHeight};
        --reader-font-family: ${settings.fontFamily};
        --reader-page-width: ${settings.pageWidth}px;
        --reader-side-margin: ${settings.sideMargin}px;
        --reader-bg-color: ${themeColors.bg};
        --reader-text-color: ${themeColors.text};
      }

      .epub-content {
        font-size: var(--reader-font-size);
        line-height: var(--reader-line-height);
        font-family: var(--reader-font-family);
        color: var(--reader-text-color);
        background-color: var(--reader-bg-color);
        max-width: var(--reader-page-width);
        margin: 0 auto;
        padding: 20px var(--reader-side-margin);
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      .epub-content p {
        margin: 1em 0;
        text-indent: 2em;
      }

      .epub-content img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1em auto;
      }

      .epub-content h1,
      .epub-content h2,
      .epub-content h3,
      .epub-content h4,
      .epub-content h5,
      .epub-content h6 {
        margin: 1.5em 0 0.5em;
        text-indent: 0;
      }

      .epub-content a {
        color: #4a90d9;
        text-decoration: none;
      }

      .epub-content a:hover {
        text-decoration: underline;
      }

      .epub-content blockquote {
        margin: 1em 2em;
        padding-left: 1em;
        border-left: 3px solid #ccc;
      }

      .epub-content pre,
      .epub-content code {
        font-family: 'Consolas', 'Monaco', monospace;
        background-color: rgba(0, 0, 0, 0.05);
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }

      .epub-content pre {
        padding: 1em;
        overflow-x: auto;
      }

      .epub-error {
        color: #e74c3c;
        text-align: center;
        padding: 2em;
        font-size: 1.2em;
      }
    `
  }

  private getThemeColors(theme: string): { bg: string; text: string } {
    const themes: Record<string, { bg: string; text: string }> = {
      light: { bg: '#ffffff', text: '#333333' },
      dark: { bg: '#1a1a1a', text: '#e0e0e0' },
      sepia: { bg: '#f4ecd8', text: '#5b4636' }
    }

    return themes[theme] || themes.light
  }
}
