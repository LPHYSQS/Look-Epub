function generateFontList(): { name: string; label: string }[] {
  const fonts: { name: string; label: string }[] = []
  
  const genericFonts = [
    { name: 'serif', label: '衬线体' },
    { name: 'sans-serif', label: '无衬线体' },
    { name: 'monospace', label: '等宽字体' },
    { name: 'cursive', label: '手写体' },
    { name: 'fantasy', label: '装饰体' },
    { name: 'system-ui', label: '系统UI' }
  ]
  fonts.push(...genericFonts)

  const windowsFonts = [
    'Microsoft YaHei', 'Microsoft YaHei UI', 'SimSun', 'SimHei', 'KaiTi', 'KaiTi_GB2312',
    'FangSong', 'FangSong_GB2312', 'YouYuan', 'MingLiU', 'PMingLiU', 'MingLiU_HKSCS',
    'STSong', 'STKaiti', 'STZhongsong', 'STXingkai', 'STXinWei', 'STCaiyun', 'STHupo',
    'STLiti', 'STHeiti', 'STFangsong', 'STYuanti', 'FZYaoTi', 'FZSongTi', 'FZKaiTi',
    'Noto Sans SC', 'Noto Serif SC', 'Source Han Sans SC', 'Source Han Serif SC',
    'Adobe Kaiti Std', 'Adobe Song Std', 'Adobe Heiti Std', 'Adobe Fangsong Std',
    'Baoli SC', 'Lantinghei SC', 'Luxi Sans', 'Yi Bai Lun', 'Ecommercial',
    'ShuHei', 'ShuSong', 'Weibei', 'Yuanti', 'Xingshu', 'Libian', 'ZhunYuan',
    'HanYixian', 'Wandou', 'Douyin Sans', 'Alibaba PuHuiTi', 'Alibaba PuHuiTi 2',
    'ZCOOL XiaoWei', 'ZCOOL QingKe HuangYou', 'ZCOOL WeiBei', 'ZCOOL LeYou',
    'OPPOSans', 'Huawei Sans', 'Honor Sans', 'SmartisanSmallSquare', 'SmartisanCompact',
    'WenQuanYi Zen Hei', 'WenQuanYi Micro Hei', 'WenQuanYi Bitmap Song',
    'AR PL UMing CN', 'AR PL UKai CN', 'AR PL Songti CN'
  ]
  
  const macFonts = [
    'PingFang SC', 'PingFang TC', 'PingFang HK', 'Hiragino Sans GB', 'Heiti SC',
    'Heiti TC', 'LiHei Pro', 'LiSong Pro', 'Weibei SC', 'Yuanti SC', 'Kaiti SC',
    'Songti SC', 'Yuanshou', 'ShaoNv', 'Xingkai SC', 'Baoli', 'Lantinghei',
    'Avenir Next', 'Avenir', 'Chalkboard SE', 'Futura', 'Gill Sans', 'Helvetica Neue'
  ]
  
  const officeFonts = [
    'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Candara',
    'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New',
    'Georgia', 'Garamond', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
    'Palatino Linotype', 'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold',
    'Segoe UI Black', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
    'Century Gothic', 'Book Antiqua', 'Bookman Old Style', 'Brush Script MT',
    'Castellar', 'Centaur', 'Clarendon', 'Elephant', 'English111 Vivace',
    'Forte', 'Franklin Gothic Medium', 'Freestyle Script', 'Garamond',
    'Haettenschweiler', 'Harlow Solid Italic', 'Harrington', 'High Tower Text',
    'Informal Roman', 'Jokerman', 'Juice ITC', 'Kunstler Script', 'Lucida Bright',
    'Lucida Fax', 'Magneto', 'Matura MT Script Capitals', 'Mistral', 'Modern No. 20',
    'Monotype Corsiva', 'Niagara Engraved', 'Niagara Solid', 'OCR A Extended',
    'Old English Text MT', 'Onyx', 'Palace Script MT', 'Parchment', 'Perpetua',
    'Perpetua Titling MT', 'Playbill', 'Poor Richard', 'Pristina', 'Rage Italic',
    'Rockwell', 'Rockwell Condensed', 'Rockwell Extra Bold', 'Script MT Bold',
    'Showcard Gothic', 'Snap ITC', 'Stencil', 'Tempus Sans ITC', 'Tw Cen MT',
    'Viner Hand ITC', 'Vivaldi', 'Vladimir Script', 'Wide Latin'
  ]

  const codingFonts = [
    'Monaco', 'Menlo', 'Courier', 'Consolas', 'Source Code Pro', 'Fira Code',
    'JetBrains Mono', 'Inconsolata', 'Roboto Mono', 'Ubuntu Mono', 'Droid Sans Mono',
    'DejaVu Sans Mono', 'Hack', 'Cascadia Code', 'Cascadia Mono', 'IBM Plex Mono',
    'Space Mono', 'Anonymous Pro', 'Overpass Mono', 'Victor Mono', 'Iosevka'
  ]

  const webFonts = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro',
    'Raleway', 'PT Sans', 'Merriweather', 'Nunito', 'Playfair Display',
    'Rubik', 'Poppins', 'Work Sans', 'Barlow', 'Mukta', 'Bitter', 'Fira Sans',
    'Crimson Text', 'Lora', 'Droid Sans', 'Droid Serif', 'Ubuntu', 'Karla',
    'Cabin', 'Libre Baskerville', 'Bebas Neue', 'Anton', 'Dosis', 'Quicksand',
    'Josefin Sans', 'Arvo', 'Lobster', 'Pacifico', 'Shadows Into Light'
  ]

  const otherFonts = [
    'Comic Sans MS', 'Wingdings', 'Wingdings 2', 'Wingdings 3', 'Symbol',
    'MS Outlook', 'Marlett', 'Emoji', 'Segoe UI Symbol', 'Segoe UI Historic',
    'Aharoni', 'David', 'Franklin Gothic', 'Miriam', 'Narkisim', 'Rod',
    'Simplified Arabic', 'Traditional Arabic', 'Arabic Typesetting', 'Sakkal Majalla',
    'Traditional Arabic', 'Arial', 'Times New Roman', 'Courier New',
    'English111 Vivace', 'Korean Typesetting', 'Myanmar Text', 'Malgun Gothic',
    'Gungsuh', 'Batang', 'Gulim', 'Dotum', 'Gungsuh Cheong', 'BatangCheong'
  ]

  const allFontNames = [...windowsFonts, ...macFonts, ...officeFonts, ...codingFonts, ...webFonts, ...otherFonts]
  const uniqueFontNames = [...new Set(allFontNames)]

  for (const name of uniqueFontNames) {
    fonts.push({ name, label: name })
  }

  return fonts
}

export async function getSystemFonts(): Promise<{ value: string; label: string }[]> {
  if (typeof document === 'undefined') {
    return generateFontList().map(f => ({ value: f.name, label: f.label }))
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  ctx.font = '72px sans-serif'
  const baseWidth = ctx.measureText('mmmmmmmmmm').width
  
  const availableFonts: { value: string; label: string }[] = []
  const testedFonts = new Set<string>()
  const baseFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']

  const allFonts = generateFontList()

  for (const font of allFonts) {
    const fontName = font.name
    
    if (testedFonts.has(fontName.toLowerCase())) {
      continue
    }
    testedFonts.add(fontName.toLowerCase())

    ctx.font = `72px "${fontName}", sans-serif`
    const testWidth = ctx.measureText('mmmmmmmmmm').width
    
    const isDifferent = Math.abs(testWidth - baseWidth) > 3
    
    let isBaseFont = false
    for (const baseFont of baseFonts) {
      if (fontName.toLowerCase() === baseFont.toLowerCase()) {
        isBaseFont = true
        break
      }
    }
    
    if (isDifferent || isBaseFont) {
      availableFonts.push({ value: fontName, label: font.label })
    }
  }

  if (availableFonts.length === 0) {
    return generateFontList().map(f => ({ value: f.name, label: f.label }))
  }

  return availableFonts
}

export function getFontLabel(fontFamily: string): string {
  return fontFamily
}
