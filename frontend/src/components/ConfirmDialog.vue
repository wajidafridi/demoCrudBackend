<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
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
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
    >
      <h2 id="confirm-dialog-title" class="text-lg font-semibold text-slate-900">{{ title }}</h2>
      <p id="confirm-dialog-message" class="mt-2 text-sm text-slate-600">{{ message }}</p>
      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-60"
          :disabled="busy"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
          :disabled="busy"
          @click="emit('confirm')"
        >
          {{ busy ? 'Deleting…' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
