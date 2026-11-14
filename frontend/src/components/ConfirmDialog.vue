<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

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

const panel = ref<HTMLElement | null>(null)
let restoreFocus: HTMLElement | null = null

function focusable(): HTMLElement[] {
  const root = panel.value
  if (root == null) {
    return []
  }

  return [
    ...root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ]
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.busy !== true) {
    event.preventDefault()
    emit('cancel')
    return
  }

  if (event.key !== 'Tab' || panel.value == null) {
    return
  }

  const items = focusable()
  if (items.length === 0) {
    event.preventDefault()
    panel.value.focus()
    return
  }

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !panel.value.contains(active))) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first?.focus()
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      panel.value?.focus()
      return
    }

    window.removeEventListener('keydown', onKeydown)
    restoreFocus?.focus()
    restoreFocus = null
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4">
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      class="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-[var(--shadow-card)] focus:outline-none"
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
