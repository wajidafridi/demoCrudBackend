<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section
    class="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
  >
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">403 Access Denied</h2>
    <p class="mt-3 text-slate-600">
      You are signed in, but you do not have permission to open this page. If you need access, ask
      an administrator to update your role rights, then sign in again.
    </p>
    <RouterLink
      :to="{ name: 'home' }"
      class="mt-6 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      Return to dashboard
    </RouterLink>
  </section>
</template>
