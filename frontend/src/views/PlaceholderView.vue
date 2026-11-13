<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : 'Coming soon',
)
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{{ title }}</h2>
    <p class="mt-2 max-w-2xl text-slate-600">
      This screen is a route placeholder. Full CRUD UI will be added in a later phase.
    </p>
  </section>
</template>
