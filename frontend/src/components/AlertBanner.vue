<script setup lang="ts">
defineProps<{
  variant: 'success' | 'error'
  message: string
}>()
</script>

<template>
  <div
    :role="variant === 'error' ? 'alert' : 'status'"
    class="rounded-lg border px-3 py-2 text-sm"
    :class="
      variant === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
    "
  >
    {{ message }}
  </div>
</template>
