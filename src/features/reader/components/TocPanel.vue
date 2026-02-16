<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import type { EpubTocItem } from '@/types'

const props = defineProps<{
  toc: EpubTocItem[]
  currentIndex: number
}>()

const emit = defineEmits<{
  select: [index: number]
  close: []
}>()

const tocContentRef = ref<HTMLElement | null>(null)

function handleItemClick(_item: EpubTocItem, index: number) {
  emit('select', index)
}

function flattenToc(items: EpubTocItem[], level = 0): Array<{ item: EpubTocItem; level: number; index: number }> {
  const result: Array<{ item: EpubTocItem; level: number; index: number }> = []
  let idx = 0
  
  function flatten(itemsList: EpubTocItem[], lvl: number) {
    for (const item of itemsList) {
      result.push({ item, level: lvl, index: idx++ })
      if (item.children) {
        flatten(item.children, lvl + 1)
      }
    }
  }
  
  flatten(items, level)
  return result
}

const flatToc = computed(() => flattenToc(props.toc))

function scrollToCurrentChapter() {
  nextTick(() => {
    if (!tocContentRef.value) return
    const activeItem = tocContentRef.value.querySelector('.toc-item.active') as HTMLElement
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'auto', block: 'center' })
    }
  })
}

watch(() => props.toc, () => {
  scrollToCurrentChapter()
}, { immediate: true })
</script>

<template>
  <div class="toc-panel">
    <div class="toc-header">
      <h2>目录</h2>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>
    <div class="toc-content" ref="tocContentRef">
      <div v-if="flatToc.length === 0" class="toc-empty">
        暂无目录
      </div>
      <div
        v-for="{ item, level, index } in flatToc"
        :key="item.id"
        class="toc-item"
        :class="{ active: index === currentIndex }"
        :style="{ paddingLeft: `${level * 20 + 15}px` }"
        @click="handleItemClick(item, index)"
      >
        {{ item.title }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.toc-panel {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 300px;
  background: #fff;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 200;
  display: flex;
  flex-direction: column;
}

[data-theme="dark"] .toc-panel {
  background: #1a1a2e;
}

[data-theme="dark"] .toc-header {
  border-bottom-color: #333;
}

[data-theme="dark"] .toc-header h2 {
  color: #e0e0e0;
}

[data-theme="dark"] .close-btn {
  color: #aaa;
}

[data-theme="dark"] .toc-item {
  color: #ccc;
  border-bottom-color: #333;
}

[data-theme="dark"] .toc-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .toc-item.active {
  background: rgba(74, 144, 217, 0.2);
  color: #4a90d9;
}

.theme-sepia .toc-panel {
  background: #f4ecd8;
}

.theme-sepia .toc-header {
  border-bottom-color: #d4c9a8;
}

.theme-sepia .toc-header h2 {
  color: #3d3426;
}

.theme-sepia .close-btn {
  color: #5c5340;
}

.theme-sepia .toc-item {
  color: #5c5340;
  border-bottom-color: #d4c9a8;
}

.theme-sepia .toc-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.theme-sepia .toc-item.active {
  background: rgba(139, 115, 85, 0.2);
  color: #8b7355;
}

.toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.toc-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.toc-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.toc-empty {
  padding: 20px;
  text-align: center;
  color: #999;
}

.toc-item {
  padding: 10px 15px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #333;
}

.toc-item:hover {
  background: #f5f5f5;
}

.toc-item.active {
  background: #e3f2fd;
  color: #1976d2;
}
</style>
