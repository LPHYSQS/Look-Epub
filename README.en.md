# Look Epub

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1-blue" alt="Version">
  <img src="https://img.shields.io/badge/Vue-3.5.13-42b883" alt="Vue">
  <img src="https://img.shields.io/badge/TypeScript-5.6.3-3178c6" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6.0.5-646CFF" alt="Vite">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="README.en.md">English</a>
</p>

## 📖 Introduction

Look Epub is a fully local EPUB e-book reader designed for users who seek a clean and distraction-free reading experience. No internet connection required — all data is stored locally in your browser, ensuring complete privacy protection.

## ✨ Features

### 📚 Library Management
- **Drag & Drop Import**: Drag EPUB files directly into the window to import
- **Batch Import**: Import multiple e-books from a folder at once
- **Smart Search**: Search books by title or author
- **Batch Management**: Select and delete multiple books simultaneously
- **Book Editing**: Customize book title, author, and cover image
- **Reading Progress**: View reading progress for each book

### 📖 Reader
- **Chapter Navigation**: Table of contents navigation with quick chapter jumping
- **Page Navigation**: Support keyboard arrow keys and spacebar for page turning
- **Progress Memory**: Automatically save and restore reading progress
- **Link Navigation**: Support internal EPUB link navigation

### 🎨 Theme Modes
- **Light Mode**: Bright and refreshing reading interface
- **Dark Mode**: Perfect for low-light environments
- **Sepia Mode**: Warm parchment color scheme

### ⚙️ Reading Settings
- **Font Size**: Adjustable to personal preference
- **Reading Themes**: Switch between three theme modes

## 🛠️ Tech Stack

- **Frontend Framework**: Vue 3 (Composition API)
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Pinia
- **Local Storage**: IndexedDB
- **EPUB Parsing**: fflate (ZIP extraction)

## 🚀 Quick Start

### Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

#### Install Node.js

**Option 1: Download from Official Website**
- Visit [Node.js Official Website](https://nodejs.org/)
- Download the LTS (Long Term Support) version
- Run the installer, ensure "Add to PATH" is checked

**Option 2: Use Package Manager**
- Windows: `winget install OpenJS.NodeJS.LTS`
- macOS: `brew install node@18`
- Linux: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`

#### Check Installation

```bash
# Check Node.js version
node --version

# Check npm version
npm --version
```

If version numbers are displayed (e.g., `v18.x.x` and `9.x.x`), the installation is successful.

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

After starting, the browser will open automatically. If not, check the terminal for the actual port (default http://localhost:3000).

### Build for Production

```bash
npm run build
```

The build output will be in the `dist` directory.

### Type Check

```bash
npm run typecheck
```

## 📁 Project Structure

```
Look-Epub/
├── public/                  # Static assets
│   └── favicon.svg         # Website favicon
├── src/
│   ├── core/               # Core modules
│   │   ├── parser/         # EPUB parsers
│   │   │   ├── epub-parser.ts      # Main EPUB parser
│   │   │   ├── opf-parser.ts       # OPF file parser
│   │   │   ├── ncx-parser.ts       # NCX toc parser
│   │   │   ├── nav-parser.ts       # NAV nav parser
│   │   │   └── zip-extractor.ts    # ZIP file extractor
│   │   └── renderer/       # Content renderers
│   │       ├── content-renderer.ts # Content rendering
│   │       └── style-injector.ts   # Style injection
│   ├── features/           # Feature modules
│   │   ├── library/        # Library feature
│   │   │   └── components/
│   │   │       └── LibraryView.vue  # Library view
│   │   └── reader/         # Reader feature
│   │       └── components/
│   │           ├── ReaderView.vue   # Reader view
│   │           ├── Toolbar.vue      # Toolbar
│   │           ├── TocPanel.vue     # Table of contents panel
│   │           └── SettingsPanel.vue # Settings panel
│   ├── storage/            # Storage module
│   │   ├── indexeddb.ts    # IndexedDB operations
│   │   └── local-storage.ts # Local storage
│   ├── stores/              # Pinia state management
│   │   ├── library-store.ts # Library state
│   │   ├── reader-store.ts  # Reader state
│   │   └── theme-store.ts   # Theme state
│   ├── types/              # TypeScript type definitions
│   │   ├── epub.ts         # EPUB related types
│   │   └── reader.ts       # Reader types
│   ├── utils/              # Utility functions
│   │   └── fonts.ts        # Font utilities
│   ├── App.vue             # Root component
│   └── main.ts             # Entry point
├── index.html              # HTML entry
├── package.json            # Project config
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
└── README.md               # Project documentation
```

## 🔧 Core Modules

### EPUB Parser

The EPUB parser is responsible for parsing EPUB file structure:

1. **ZipExtractor**: Extract EPUB files (EPUB is essentially a ZIP archive)
2. **OpfParser**: Parse OPF files to get metadata, resource manifest, and reading order
3. **NcxParser/NavParser**: Parse table of contents (supports both NCX and NAV formats)
4. **EpubParser**: Coordinates all parsers to complete the entire EPUB parsing

### Content Renderer

ContentRenderer is responsible for rendering EPUB content to the page:
- Process XHTML/HTML content
- Inject and isolate CSS styles
- Handle internal link navigation

### Data Storage

Uses IndexedDB to store book data:
- Book file content (binary)
- Metadata information
- Reading progress
- Custom settings

## 📄 License

This project is open-sourced under the MIT License.

## 👤 Author

已逝情殇 (Yishi Qing Shang)

## 📝 Changelog

### v0.1 (2026-01-15)
- Initial release
- Library management support (import, search, edit, delete)
- EPUB reader support
- Three theme mode support
- Drag & drop and batch import support
- Automatic reading progress saving
