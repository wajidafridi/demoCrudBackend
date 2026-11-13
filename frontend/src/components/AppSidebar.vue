<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import NavIcons from '@/components/icons/NavIcons.vue'
import { appNavItems } from '@/navigation/appNav'
import { useAuthStore } from '@/stores/authStore'

defineProps<{
  collapsed: boolean
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  closeMobile: []
  toggleCollapse: []
}>()

const authStore = useAuthStore()

const visibleNavItems = computed(() =>
  appNavItems.filter((item) => {
    if (!authStore.isAuthenticated) {
      return false
    }
    if (item.permission == null) {
      return true
    }
    return authStore.hasPermission(item.permission)
  }),
)

function iconFor(label: string): 'dashboard' | 'users' | 'roles' | 'account' {
  switch (label) {
    case 'Users':
      return 'users'
    case 'Roles':
      return 'roles'
    case 'Account':
      return 'account'
    default:
      return 'dashboard'
  }
}
</script>

<template>
  <!-- Mobile overlay -->
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
    aria-hidden="true"
    @click="emit('closeMobile')"
  />

  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-200 transition-transform duration-200 lg:static lg:translate-x-0"
    :class="[mobileOpen ? 'translate-x-0' : '-translate-x-full', collapsed ? 'lg:w-20' : 'lg:w-64']"
    aria-label="Application"
  >
    <div class="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
      <div
        class="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white"
        aria-hidden="true"
      >
        DC
      </div>
      <div v-if="!collapsed || mobileOpen" class="min-w-0">
        <p class="truncate text-sm font-semibold text-white">DemoCrud</p>
        <p class="truncate text-xs text-slate-400">Admin console</p>
      </div>
      <button
        type="button"
        class="ml-auto rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 lg:hidden"
        aria-label="Close navigation"
        @click="emit('closeMobile')"
      >
        <NavIcons name="close" />
      </button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.label"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        active-class="!bg-violet-600 !text-white hover:!bg-violet-600"
        @click="emit('closeMobile')"
      >
        <NavIcons :name="iconFor(item.label)" />
        <span v-if="!collapsed || mobileOpen">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="hidden border-t border-slate-800 p-3 lg:block">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="emit('toggleCollapse')"
      >
        <span :class="collapsed ? 'inline-flex rotate-180' : 'inline-flex'">
          <NavIcons name="chevron" />
        </span>
        <span v-if="!collapsed">Collapse</span>
      </button>
    </div>
  </aside>
</template>
