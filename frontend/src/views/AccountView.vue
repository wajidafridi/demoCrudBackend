<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import NavIcons from '@/components/icons/NavIcons.vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const router = useRouter()

const userName = computed(() => authStore.user?.userName ?? 'Unknown user')
const email = computed(() => authStore.user?.email)
const roleName = computed(() => authStore.user?.roleName)
const initials = computed(() => userName.value.slice(0, 2).toUpperCase())

async function onLogout(): Promise<void> {
  authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <section class="mx-auto max-w-3xl">
    <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full bg-sky-600 text-lg font-semibold text-white"
          aria-hidden="true"
        >
          {{ initials }}
        </div>
        <div class="min-w-0 space-y-2">
          <h2 class="truncate text-2xl font-semibold tracking-tight text-slate-900">
            {{ userName }}
          </h2>
          <p
            v-if="roleName"
            class="inline-flex rounded-full bg-surface-secondary px-3 py-1 text-xs font-semibold text-accent"
          >
            {{ roleName }}
          </p>
          <p v-else class="text-sm text-slate-500">Role unavailable until the next login.</p>
        </div>
      </div>

      <dl class="mt-8 space-y-4 border-t border-slate-100 pt-6">
        <div class="flex items-start gap-3 text-slate-400">
          <NavIcons name="account" />
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Username</dt>
            <dd class="text-sm font-medium text-slate-900">{{ userName }}</dd>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span
            class="inline-flex h-5 w-5 items-center justify-center text-slate-400"
            aria-hidden="true"
          >
            @
          </span>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt>
            <dd class="text-sm font-medium text-slate-900">
              {{ email ?? 'Not available on this session (sign in again after a full login).' }}
            </dd>
          </div>
        </div>
        <div class="flex items-start gap-3 text-slate-400">
          <NavIcons name="roles" />
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</dt>
            <dd class="text-sm font-medium text-slate-900">{{ roleName ?? 'Not available' }}</dd>
          </div>
        </div>
      </dl>

      <button
        type="button"
        class="mt-8 inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        @click="onLogout"
      >
        <NavIcons name="logout" />
        Log out
      </button>
    </article>
  </section>
</template>
