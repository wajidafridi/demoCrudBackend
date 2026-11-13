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
        ? 'border-danger bg-danger-subtle text-danger'
        : 'border-success bg-success-subtle text-success'
    "
  >
    {{ message }}
  </div>
</template>
