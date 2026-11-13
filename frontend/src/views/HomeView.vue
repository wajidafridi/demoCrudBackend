<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const router = useRouter()

async function onLogout(): Promise<void> {
  authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-3">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Home</h1>
      <p class="max-w-2xl text-slate-600">
        Vue frontend foundation is ready. Authentication and API screens will be added next.
      </p>
    </div>

    <div
      v-if="authStore.isAuthenticated"
      class="space-y-2 rounded-md border border-slate-200 bg-white p-4"
    >
      <p class="text-sm text-slate-700">
        Signed in as
        <span class="font-medium text-slate-900">{{ authStore.user?.userName }}</span>
      </p>
      <button
        type="button"
        class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        @click="onLogout"
      >
        Log out
      </button>
    </div>

    <p v-else class="text-sm text-slate-600">
      You are not signed in.
      <RouterLink to="/login" class="font-medium text-slate-800 underline underline-offset-4">
        Go to login
      </RouterLink>
    </p>
  </section>
</template>
