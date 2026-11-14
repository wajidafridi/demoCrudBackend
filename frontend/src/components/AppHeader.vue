<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import NavIcons from '@/components/icons/NavIcons.vue'
import ThemeSelector from '@/components/ThemeSelector.vue'
import { useAuthStore } from '@/stores/authStore'

withDefaults(
  defineProps<{
    pageTitle: string
    /** Whether the mobile navigation drawer is open. Drives `aria-expanded` on the menu button. */
    navigationOpen?: boolean
  }>(),
  { navigationOpen: false },
)

const emit = defineEmits<{
  openMobile: []
}>()

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const displayName = computed(() => authStore.user?.userName ?? 'User')
const roleName = computed(() => authStore.user?.roleName ?? 'No role assigned')
const initials = computed(() => displayName.value.slice(0, 2).toUpperCase())

async function onLogout(): Promise<void> {
  authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-border bg-surface">
    <div class="flex h-16 items-center gap-3 px-4 sm:px-6">
      <button
        type="button"
        class="rounded-lg p-2 text-foreground-secondary hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:hidden"
        aria-label="Open navigation"
        aria-controls="app-navigation"
        :aria-expanded="navigationOpen ? 'true' : 'false'"
        @click="emit('openMobile')"
      >
        <NavIcons name="menu" />
      </button>

      <div class="min-w-0 flex-1">
        <p class="truncate text-lg font-semibold tracking-tight text-foreground">{{ pageTitle }}</p>
        <p
          v-if="route.meta.title && route.name !== 'home'"
          class="truncate text-xs text-foreground-muted"
        >
          DemoCrud / {{ pageTitle }}
        </p>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <ThemeSelector />

        <div
          class="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary px-2.5 py-1.5"
        >
          <div
            class="flex h-9 w-9 items-center justify-center rounded-full bg-accent-solid text-xs font-semibold text-accent-foreground"
            aria-hidden="true"
          >
            {{ initials }}
          </div>
          <div class="hidden min-w-0 sm:block">
            <p class="truncate text-sm font-semibold text-foreground">{{ displayName }}</p>
            <p class="truncate text-xs text-foreground-muted">{{ roleName }}</p>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          @click="onLogout"
        >
          <NavIcons name="logout" />
          <span class="hidden sm:inline">Log out</span>
        </button>
      </div>
    </div>
  </header>
</template>
