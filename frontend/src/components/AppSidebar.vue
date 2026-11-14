<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import NavIcons from '@/components/icons/NavIcons.vue'
import { appNavItems, type AppNavItem } from '@/navigation/appNav'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps<{
  collapsed: boolean
  mobileOpen: boolean
}>()

const emit = defineEmits<{
  closeMobile: []
  toggleCollapse: []
}>()

const authStore = useAuthStore()
const route = useRoute()
const drawer = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let restoreFocus: HTMLElement | null = null

function focusable(): HTMLElement[] {
  const root = drawer.value
  if (root == null) {
    return []
  }

  return [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter(
    (element) => element.closest('.hidden.lg\\:block') == null,
  )
}

function onDrawerKeydown(event: KeyboardEvent): void {
  if (!props.mobileOpen) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    emit('closeMobile')
    return
  }

  if (event.key !== 'Tab' || drawer.value == null) {
    return
  }

  const items = focusable()
  if (items.length === 0) {
    return
  }

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !drawer.value.contains(active))) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first?.focus()
  }
}

watch(
  () => props.mobileOpen,
  async (isOpen, wasOpen) => {
    if (isOpen) {
      restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      window.addEventListener('keydown', onDrawerKeydown)
      await nextTick()
      closeButton.value?.focus()
      return
    }

    window.removeEventListener('keydown', onDrawerKeydown)
    const opener = restoreFocus
    restoreFocus = null
    if (wasOpen === true && opener != null && !drawer.value?.contains(opener)) {
      opener.focus()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onDrawerKeydown)
})

const visibleNavItems = computed(() =>
  appNavItems.filter((item) => {
    if (!authStore.isAuthenticated) {
      return false
    }
    if (item.permissions == null) {
      return true
    }
    return item.permissions.every((permission) => authStore.hasPermission(permission))
  }),
)

function isActive(item: AppNavItem): boolean {
  return route.meta.nav === item.nav
}

function iconFor(item: AppNavItem): 'dashboard' | 'users' | 'roles' | 'rights' | 'account' {
  switch (item.nav) {
    case 'users':
      return 'users'
    case 'roles':
      return 'roles'
    case 'rights':
      return 'rights'
    case 'account':
      return 'account'
    default:
      return 'dashboard'
  }
}

function onNavigate(event: MouseEvent, navigate: (event?: MouseEvent) => void): void {
  navigate(event)
  emit('closeMobile')
}
</script>

<template>
  <!-- Mobile overlay -->
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-40 bg-overlay lg:hidden"
    aria-hidden="true"
    @click="emit('closeMobile')"
  />

  <aside
    id="app-navigation"
    ref="drawer"
    class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface text-foreground transition-transform duration-200 lg:static"
    :role="mobileOpen ? 'dialog' : undefined"
    :aria-modal="mobileOpen ? 'true' : undefined"
    :class="[
      mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
      collapsed ? 'lg:w-20' : 'lg:w-64',
    ]"
    aria-label="Application"
  >
    <div class="flex h-16 items-center gap-3 border-b border-border px-4">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-solid text-sm font-bold text-accent-foreground"
        aria-hidden="true"
      >
        DC
      </div>
      <div v-if="!collapsed || mobileOpen" class="min-w-0">
        <p class="truncate text-sm font-semibold text-foreground">DemoCrud</p>
        <p class="truncate text-xs text-foreground-muted">Admin console</p>
      </div>
      <button
        type="button"
        class="ml-auto rounded-md p-1.5 text-foreground-secondary hover:bg-surface-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:hidden"
        ref="closeButton"
        aria-label="Close navigation"
        @click="emit('closeMobile')"
      >
        <NavIcons name="close" />
      </button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.nav"
        v-slot="{ href, navigate }"
        :to="item.to"
        custom
      >
        <a
          :href="href"
          :aria-label="item.label"
          :aria-current="isActive(item) ? 'page' : undefined"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          :class="
            isActive(item)
              ? 'bg-accent-solid font-semibold text-accent-foreground hover:bg-accent-solid-hover'
              : 'text-foreground-secondary hover:bg-surface-secondary hover:text-foreground'
          "
          @click="onNavigate($event, navigate)"
        >
          <NavIcons :name="iconFor(item)" />
          <span v-if="!collapsed || mobileOpen" class="truncate">{{ item.label }}</span>
        </a>
      </RouterLink>
    </nav>

    <div class="hidden border-t border-border p-3 lg:block">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground-secondary hover:bg-surface-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
