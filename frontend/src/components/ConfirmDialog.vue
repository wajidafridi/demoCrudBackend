<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
  /** Shown on the confirm button while `busy` is true. */
  busyLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.busy !== true) {
    emit('cancel')
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener('keydown', onKeydown)
      return
    }

    window.removeEventListener('keydown', onKeydown)
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      class="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-[var(--shadow-card)]"
    >
      <h2 id="confirm-dialog-title" class="text-lg font-semibold text-foreground">{{ title }}</h2>
      <p id="confirm-dialog-message" class="mt-2 text-sm text-foreground-secondary">
        {{ message }}
      </p>
      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex h-10 items-center justify-center rounded-lg bg-danger-solid px-4 text-sm font-semibold text-danger-foreground hover:bg-danger-solid-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="busy"
          @click="emit('confirm')"
        >
          {{ busy ? (busyLabel ?? 'Deleting…') : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
