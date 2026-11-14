<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'

const route = useRoute()
const sidebarCollapsed = ref(false)
const mobileOpen = ref(false)

const pageTitle = computed(() => {
  if (typeof route.meta.title === 'string' && route.meta.title.length > 0) {
    return route.meta.title
  }
  if (typeof route.name === 'string') {
    return route.name
  }
  return 'DemoCrud'
})

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-page">
    <AppSidebar
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileOpen"
      @close-mobile="mobileOpen = false"
      @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
    />

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppHeader
        :page-title="pageTitle"
        :navigation-open="mobileOpen"
        @open-mobile="mobileOpen = true"
      />

      <main class="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
