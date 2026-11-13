<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="space-y-4">
    <h1 class="text-2xl font-semibold tracking-tight text-slate-900">403 Access Denied</h1>
    <p class="max-w-2xl text-slate-600">
      You are signed in, but you do not have permission to open this page. If you need access, ask
      an administrator to update your role rights, then sign in again.
    </p>
    <RouterLink
      to="/"
      class="inline-flex text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
    >
      Return to home
    </RouterLink>
  </section>
</template>
