<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (typeof route.name === 'string' ? route.name : 'Page'))
</script>

<template>
  <section class="space-y-3">
    <h1 class="text-2xl font-semibold tracking-tight text-slate-900">{{ title }}</h1>
    <p class="max-w-2xl text-slate-600">This screen is a route placeholder. CRUD UI comes later.</p>
  </section>
</template>
