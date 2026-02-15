<script setup lang="ts">
import { computed, watch } from 'vue'
import { useReaderStore, useLibraryStore } from '@/stores'
import LibraryView from '@/features/library/components/LibraryView.vue'
import ReaderView from '@/features/reader/components/ReaderView.vue'

const readerStore = useReaderStore()
const libraryStore = useLibraryStore()

const showReader = computed(() => readerStore.currentBook !== null)

watch(showReader, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    libraryStore.loadLibrary()
  }
})
</script>

<template>
  <div class="app">
    <LibraryView v-if="!showReader" />
    <ReaderView v-else />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  height: 100%;
}

.app {
  height: 100%;
}

.theme-light {
  --reader-bg-color: #ffffff;
  --reader-text-color: #333333;
}

.theme-dark {
  --reader-bg-color: #1a1a1a;
  --reader-text-color: #e0e0e0;
}

.theme-sepia {
  --reader-bg-color: #f4ecd8;
  --reader-text-color: #5b4636;
}
</style>
