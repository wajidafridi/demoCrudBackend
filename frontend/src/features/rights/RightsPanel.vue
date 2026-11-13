<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'

import type { RightResponse } from '@/types/right'

const props = defineProps<{
  headingId: string
  title: string
  query: string
  searchLabel: string
  rights: RightResponse[]
  totalCount: number
  selectedIds: number[]
  emptyMessage: string
  actionLabel: string
  pendingLabel: string
  selectAllLabel: string
  canSelect: boolean
  pending: boolean
  busy: boolean
  loading: boolean
  error: string | null
  tone?: 'accent' | 'danger'
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  toggle: [id: number]
  toggleAll: []
  action: []
}>()

const selectAll = ref<HTMLInputElement | null>(null)

const visibleIds = computed(() => props.rights.map((right) => right.id))
const selectedVisibleCount = computed(
  () => visibleIds.value.filter((id) => props.selectedIds.includes(id)).length,
)
const allSelected = computed(
  () => visibleIds.value.length > 0 && selectedVisibleCount.value === visibleIds.value.length,
)
const someSelected = computed(() => selectedVisibleCount.value > 0 && !allSelected.value)
const countLabel = computed(() => {
  if (props.loading) {
    return 'Loading…'
  }

  const selected = props.canSelect ? ` · ${props.selectedIds.length} selected` : ''
  return `${props.rights.length} shown · ${props.totalCount} total${selected}`
})

watchEffect(() => {
  if (selectAll.value != null) {
    selectAll.value.indeterminate = someSelected.value
  }
})

function onSearch(event: Event): void {
  const target = event.target
  if (target instanceof HTMLInputElement) {
    emit('update:query', target.value)
  }
}
</script>

<template>
  <section
    class="flex min-h-80 min-w-0 flex-col rounded-2xl border border-border bg-surface"
    :aria-labelledby="headingId"
  >
    <header class="border-b border-border bg-surface-secondary px-4 py-3">
      <h2 :id="headingId" class="text-sm font-semibold text-foreground">{{ title }}</h2>
      <p class="mt-1 text-xs text-foreground-muted">{{ countLabel }}</p>
    </header>

    <div class="flex flex-1 flex-col gap-3 p-4">
      <label class="block">
        <span class="sr-only">{{ searchLabel }}</span>
        <input
          :value="query"
          type="search"
          :aria-label="searchLabel"
          placeholder="Search by name"
          :disabled="busy"
          class="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
          @input="onSearch"
        />
      </label>

      <div
        v-if="canSelect && !loading && error == null && rights.length > 0"
        class="flex items-center gap-2"
      >
        <input
          ref="selectAll"
          type="checkbox"
          :checked="allSelected"
          :disabled="busy"
          :aria-label="selectAllLabel"
          class="h-4 w-4 rounded border-border text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
          @change="emit('toggleAll')"
        />
        <span class="text-sm text-foreground-secondary">Select filtered results</span>
      </div>

      <p v-if="loading" role="status" class="text-sm text-foreground-secondary">Loading rights…</p>
      <p v-else-if="error != null" role="alert" class="text-sm text-danger">{{ error }}</p>
      <p v-else-if="rights.length === 0" class="text-sm text-foreground-secondary">
        {{ emptyMessage }}
      </p>
      <ul v-else class="max-h-80 space-y-2 overflow-y-auto" :aria-label="title">
        <li
          v-for="right in rights"
          :key="right.id"
          class="rounded-lg border border-border-subtle px-3 py-2"
        >
          <label class="flex items-start gap-3">
            <input
              v-if="canSelect"
              type="checkbox"
              :checked="selectedIds.includes(right.id)"
              :disabled="busy"
              :aria-label="`Select ${right.name}`"
              class="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
              @change="emit('toggle', right.id)"
            />
            <span class="min-w-0 break-words text-sm text-foreground">{{ right.name }}</span>
          </label>
        </li>
      </ul>

      <button
        v-if="canSelect"
        type="button"
        class="mt-auto w-full rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        :class="
          tone === 'danger'
            ? 'border border-border bg-surface text-danger hover:bg-surface-secondary'
            : 'bg-accent text-accent-foreground hover:bg-accent-hover'
        "
        :disabled="busy || loading || error != null || selectedIds.length === 0"
        @click="emit('action')"
      >
        {{ pending ? pendingLabel : actionLabel }}
      </button>
    </div>
  </section>
</template>
