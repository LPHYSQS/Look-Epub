<script setup lang="ts">
defineProps<{
  title: string
  chapterTitle: string
  progress: number
  canGoPrev: boolean
  canGoNext: boolean
  frontendStatus?: 'running' | 'stopped' | 'checking'
}>()

const emit = defineEmits<{
  toggleToc: []
  toggleSettings: []
  close: []
  prevPage: []
  nextPage: []
}>()
</script>

<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <button class="toolbar-btn" @click="emit('close')" title="返回书架">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>
      <div class="book-info">
        <h1 class="book-title">{{ title }}</h1>
        <span class="chapter-title">{{ chapterTitle }}</span>
      </div>
    </div>

    <div class="toolbar-center">
      <button 
        class="toolbar-btn nav-btn" 
        :disabled="!canGoPrev" 
        @click="emit('prevPage')"
        title="上一章"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <span class="progress-text">{{ progress }}%</span>
      </div>
      <button 
        class="toolbar-btn nav-btn" 
        :disabled="!canGoNext" 
        @click="emit('nextPage')"
        title="下一章"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>

    <div class="toolbar-right">
      <div class="service-status" v-if="frontendStatus" :class="frontendStatus" title="前端服务状态">
        <span class="status-indicator"></span>
        <span class="status-text">前端</span>
      </div>
      <button class="toolbar-btn" @click="emit('toggleToc')" title="目录">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
      </button>
      <button class="toolbar-btn" @click="emit('toggleSettings')" title="设置">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  height: 50px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .toolbar {
  background: #1a1a2e;
  border-bottom-color: #333;
}

[data-theme="dark"] .toolbar-btn {
  color: #aaa;
}

[data-theme="dark"] .toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

[data-theme="dark"] .book-title {
  color: #e0e0e0;
}

[data-theme="dark"] .chapter-title {
  color: #888;
}

[data-theme="dark"] .progress-bar {
  background: #333;
}

[data-theme="dark"] .progress-text {
  color: #888;
}

.theme-sepia .toolbar {
  background: #f4ecd8;
  border-bottom-color: #d4c9a8;
}

.theme-sepia .toolbar-btn {
  color: #5c5340;
}

.theme-sepia .toolbar-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.theme-sepia .book-title {
  color: #3d3426;
}

.theme-sepia .chapter-title {
  color: #6b5f4d;
}

.theme-sepia .progress-bar {
  background: #d4c9a8;
}

.theme-sepia .progress-text {
  color: #6b5f4d;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  color: #666;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.book-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.book-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chapter-title {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: center;
}

.toolbar-btn.nav-btn {
  padding: 6px;
  border-radius: 4px;
}

.toolbar-btn.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.toolbar-btn.nav-btn:not(:disabled):hover {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .toolbar-btn.nav-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.1);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  width: 200px;
  height: 4px;
  background: #eee;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4a90d9;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #999;
  min-width: 40px;
}

.toolbar-right {
  display: flex;
  gap: 5px;
  flex: 1;
  justify-content: flex-end;
}

.service-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #666;
  transition: color 0.3s ease;
}

.service-status.running {
  background: rgba(74, 222, 128, 0.15);
}

.service-status.running .status-indicator {
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80, 0 0 12px rgba(74, 222, 128, 0.5);
}

.service-status.running .status-text {
  color: #16a34a;
}

.service-status.stopped {
  background: rgba(248, 113, 113, 0.15);
}

.service-status.stopped .status-indicator {
  background: #f87171;
  box-shadow: 0 0 6px #f87171;
}

.service-status.stopped .status-text {
  color: #dc2626;
}

.service-status.checking {
  background: rgba(251, 191, 36, 0.15);
}

.service-status.checking .status-indicator {
  background: #fbbf24;
  animation: pulse 1s infinite;
}

.service-status.checking .status-text {
  color: #d97706;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.theme-sepia .service-status {
  background: rgba(92, 83, 64, 0.15);
}

.theme-sepia .service-status.running {
  background: rgba(22, 163, 74, 0.2);
}

.theme-sepia .service-status.running .status-indicator {
  background: #16a34a;
  box-shadow: 0 0 8px #16a34a, 0 0 12px rgba(22, 163, 74, 0.4);
}

.theme-sepia .service-status.running .status-text {
  color: #15803d;
}

.theme-sepia .service-status.stopped {
  background: rgba(220, 38, 38, 0.2);
}

.theme-sepia .service-status.stopped .status-indicator {
  background: #dc2626;
  box-shadow: 0 0 6px #dc2626;
}

.theme-sepia .service-status.stopped .status-text {
  color: #b91c1c;
}

.theme-sepia .service-status.checking {
  background: rgba(217, 119, 6, 0.2);
}

.theme-sepia .service-status.checking .status-indicator {
  background: #d97706;
}

.theme-sepia .service-status.checking .status-text {
  color: #b45309;
}

.theme-sepia .status-text {
  color: #5c5340;
}

[data-theme="dark"] .service-status {
  background: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .service-status.running {
  background: rgba(74, 222, 128, 0.15);
}

[data-theme="dark"] .service-status.running .status-indicator {
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80, 0 0 12px rgba(74, 222, 128, 0.5);
}

[data-theme="dark"] .service-status.running .status-text {
  color: #86efac;
}

[data-theme="dark"] .service-status.stopped {
  background: rgba(248, 113, 113, 0.15);
}

[data-theme="dark"] .service-status.stopped .status-indicator {
  background: #f87171;
  box-shadow: 0 0 6px #f87171;
}

[data-theme="dark"] .service-status.stopped .status-text {
  color: #fca5a5;
}

[data-theme="dark"] .service-status.checking {
  background: rgba(251, 191, 36, 0.15);
}

[data-theme="dark"] .service-status.checking .status-indicator {
  background: #fbbf24;
}

[data-theme="dark"] .service-status.checking .status-text {
  color: #fcd34d;
}

[data-theme="dark"] .status-text {
  color: #aaa;
}
</style>
