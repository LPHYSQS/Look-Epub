# Look Epub

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/Vue-3.5.13-42b883" alt="Vue">
  <img src="https://img.shields.io/badge/TypeScript-5.6.3-3178c6" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6.0.5-646CFF" alt="Vite">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="README.en.md">English</a>
</p>

## 📖 项目简介

Look Epub 是一款纯本地化的 EPUB 电子书阅读器，专为追求简洁阅读体验的用户设计。无需网络连接，所有数据均存储于本地浏览器中，全面保护您的隐私。

## ✨ 功能特性

### 📚 书架管理
- **拖拽导入**：支持将 EPUB 文件直接拖入窗口导入
- **批量导入**：支持选择文件夹批量导入电子书
- **智能搜索**：按书名或作者搜索书籍
- **批量管理**：支持多选书籍进行批量删除
- **书籍编辑**：自定义书名、作者和封面图片
- **阅读进度**：显示每本书的阅读进度

### 📖 阅读器
- **章节导航**：支持目录导航，快速跳转章节
- **翻页控制**：支持键盘方向键、空格键翻页
- **进度记忆**：自动保存并恢复阅读进度
- **链接跳转**：支持 EPUB 内部链接跳转
- **沉浸式阅读**：全屏模式，专注阅读
- **连续阅读**：滚动到底部自动加载下一章
- **快捷滚动**：一键跳转到页面顶部/底部

### ⏱️ 智能阅读统计
- **阅读时间预估**：基于实际阅读速度智能计算剩余阅读时间
- **字数统计**：精确统计章节字数，比按章节计算更准确
- **加权平均**：近期阅读速度权重更高，更贴合当前阅读节奏
- **数据持久化**：阅读统计数据本地存储

### 🎨 主题模式
- **白天模式**：明亮清爽的阅读界面
- **夜间模式**：适合暗光环境阅读
- **护眼模式**：温暖的羊皮纸色调

### ⚙️ 阅读设置
- **字体大小**：可根据个人喜好调整
- **行高设置**：调整阅读行间距
- **字体选择**：多种字体可选
- **页面宽度**：自定义阅读区域宽度
- **阅读主题**：三种主题模式随心切换

## 🛠️ 技术栈

- **前端框架**：Vue 3 (Composition API)
- **语言**：TypeScript
- **构建工具**：Vite
- **状态管理**：Pinia
- **本地存储**：IndexedDB
- **EPUB 解析**：fflate (ZIP 解压)

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

#### 安装 Node.js

**方式一：官网下载**
- 访问 [Node.js 官网](https://nodejs.org/)
- 下载 LTS（长期支持）版本
- 运行安装程序，勾选 "Add to PATH"

**方式二：使用包管理器**
- Windows: `winget install OpenJS.NodeJS.LTS`
- macOS: `brew install node@18`
- Linux: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`

#### 检查是否已安装

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version
```

如果显示版本号（如 `v18.x.x` 和 `9.x.x`），说明已安装成功。

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

服务启动后，浏览器将自动打开。若未自动打开，请查看终端显示的实际端口（默认 http://localhost:3000 ）。

### 构建生产版本

```bash
npm run build
```

构建完成后，产物位于 `dist` 目录。

### 类型检查

```bash
npm run typecheck
```

## 📁 项目结构

```
Look-Epub/
├── public/                  # 静态资源
│   └── favicon.svg         # 网站图标
├── src/
│   ├── core/               # 核心模块
│   │   ├── parser/         # EPUB 解析器
│   │   │   ├── epub-parser.ts      # EPUB 主解析器
│   │   │   ├── opf-parser.ts       # OPF 文件解析
│   │   │   ├── ncx-parser.ts       # NCX 目录解析
│   │   │   ├── nav-parser.ts       # NAV 导航解析
│   │   │   └── zip-extractor.ts    # ZIP 文件提取
│   │   └── renderer/       # 内容渲染器
│   │       ├── content-renderer.ts # 内容渲染
│   │       └── style-injector.ts   # 样式注入
│   ├── features/           # 功能模块
│   │   ├── library/        # 书架功能
│   │   │   └── components/
│   │   │       └── LibraryView.vue  # 书架视图
│   │   └── reader/         # 阅读器功能
│   │       └── components/
│   │           ├── ReaderView.vue   # 阅读器视图
│   │           ├── Toolbar.vue      # 工具栏
│   │           ├── TocPanel.vue     # 目录面板
│   │           └── SettingsPanel.vue # 设置面板
│   ├── storage/            # 存储模块
│   │   ├── indexeddb.ts    # IndexedDB 操作
│   │   └── local-storage.ts # 本地存储
│   ├── stores/              # Pinia 状态管理
│   │   ├── library-store.ts # 书架状态
│   │   ├── reader-store.ts  # 阅读器状态
│   │   └── theme-store.ts   # 主题状态
│   ├── types/              # TypeScript 类型定义
│   │   ├── epub.ts         # EPUB 相关类型
│   │   └── reader.ts       # 阅读器类型
│   ├── utils/              # 工具函数
│   │   ├── fonts.ts        # 字体相关
│   │   └── reading-stats.ts # 阅读统计
│   ├── App.vue             # 根组件
│   └── main.ts             # 入口文件
├── index.html              # HTML 入口
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 配置
├── CHANGELOG.md            # 更新日志
└── README.md               # 项目文档
```

## 🔧 核心模块说明

### EPUB 解析器

EPUB 解析器负责解析 EPUB 文件结构：

1. **ZipExtractor**：解压 EPUB 文件（EPUB 本质是 ZIP 压缩包）
2. **OpfParser**：解析 OPF 文件，获取元数据、资源清单和阅读顺序
3. **NcxParser/NavParser**：解析目录结构（支持 NCX 和 NAV 两种格式）
4. **EpubParser**：协调各解析器，完成整个 EPUB 的解析

### 内容渲染器

ContentRenderer 负责将 EPUB 内容渲染到页面：
- 处理 XHTML/HTML 内容
- 注入并隔离 CSS 样式
- 处理内部链接跳转

### 数据存储

使用 IndexedDB 存储书籍数据：
- 书籍文件内容（二进制）
- 元数据信息
- 阅读进度
- 自定义设置
- 阅读统计数据

## 📄 许可证

本项目基于 MIT 许可证开源。

## 👤 作者

已逝情殇

## 📝 更新日志

### V1.0 (2026-02-20)
- 新增智能阅读时间预估系统
- 新增沉浸式阅读模式（全屏）
- 新增连续阅读模式（自动加载下一章）
- 新增快捷滚动按钮
- 浏览器标签页标题同步
- 全新应用图标设计

### V0.2 (2026-02-16)
- 阅读界面状态栏优化：支持鼠标悬停展开/收起动画
- 目录面板优化：打开时自动定位到当前阅读章节
- 状态栏热区检测优化：提升交互灵敏度

### V0.1 (2026-01-15)
- 初始版本发布
- 支持书架管理（导入、搜索、编辑、删除）
- 支持 EPUB 阅读器
- 支持三种主题模式
- 支持拖拽导入和批量导入
- 支持阅读进度自动保存
