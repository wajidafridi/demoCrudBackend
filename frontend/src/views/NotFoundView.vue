<script setup lang="ts">
import { RouterLink } from 'vue-router'

import ThemeSelector from '@/components/ThemeSelector.vue'
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-page">
    <div class="flex justify-end px-4 pt-4 sm:px-6 sm:pt-6">
      <ThemeSelector />
    </div>

    <main class="flex flex-1 items-center justify-center px-4 py-8">
      <section
        class="w-full min-w-0 max-w-lg rounded-2xl border border-border bg-surface p-6 text-center shadow-[var(--shadow-card)] sm:p-8"
      >
        <p class="text-sm font-semibold text-accent">404</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p class="mt-3 text-sm text-foreground-secondary">
          That address does not match a page in Demo CRUD. Check the link, or return to the
          dashboard.
        </p>
        <RouterLink
          :to="{ name: 'home' }"
          class="mt-6 inline-flex h-10 items-center rounded-lg bg-accent-solid px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-solid-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Go to dashboard
        </RouterLink>
      </section>
    </main>
  </div>
</template>
