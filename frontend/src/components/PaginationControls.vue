<script setup lang="ts">
import { PAGE_SIZE_OPTIONS } from '@/constants/pagination'
import type { PaginationMetadata } from '@/types/api'

withDefaults(
  defineProps<{
    pagination: PaginationMetadata
    pageSize: number
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
  'update:pageSize': [pageSize: number]
}>()

function onPageSizeChange(event: Event): void {
  const select = event.target
  if (!(select instanceof HTMLSelectElement)) {
    return
  }

  const nextSize = Number(select.value)
  if (!Number.isInteger(nextSize) || nextSize < 1) {
    return
  }

  emit('update:pageSize', nextSize)
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-slate-600">
      Page {{ pagination.pageNumber }} of {{ pagination.totalPages }} · {{ pagination.totalCount }}
      {{ itemLabel }}
    </p>
    <div class="flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2 text-sm text-slate-600">
        <span class="whitespace-nowrap">Rows per page</span>
        <select
          class="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          :value="pageSize"
          :disabled="disabled"
          aria-label="Rows per page"
          @change="onPageSizeChange"
        >
          <option v-for="size in PAGE_SIZE_OPTIONS" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </label>
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
  </div>
</template>
