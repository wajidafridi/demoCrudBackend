<script setup lang="ts">
import type { PaginationMetadata } from '@/types/api'

withDefaults(
  defineProps<{
    pagination: PaginationMetadata
    disabled?: boolean
    /** Plural noun used in the count, for example "users" or "roles". */
    itemLabel?: string
  }>(),
  {
    itemLabel: 'users',
  },
)

const emit = defineEmits<{
  change: [pageNumber: number]
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-slate-600">
      Page {{ pagination.pageNumber }} of {{ pagination.totalPages }} · {{ pagination.totalCount }}
      {{ itemLabel }}
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="disabled || !pagination.hasPreviousPage"
        @click="emit('change', pagination.pageNumber - 1)"
      >
        Previous page
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="disabled || !pagination.hasNextPage"
        @click="emit('change', pagination.pageNumber + 1)"
      >
        Next page
      </button>
    </div>
  </div>
</template>
