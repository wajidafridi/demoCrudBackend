<script setup lang="ts">
defineProps<{
  id: string
  label: string
  modelValue: string
  type?: 'text' | 'email' | 'password' | 'date' | 'tel' | 'url'
  required?: boolean
  disabled?: boolean
  error?: string | null
  hint?: string | null
  autocomplete?: string
  maxlength?: number
  inputmode?: 'text' | 'numeric' | 'email' | 'tel' | 'url'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="block text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-600">*</span>
    </label>
    <div class="flex gap-2">
      <input
        :id="id"
        :name="id"
        :type="type ?? 'text'"
        :value="modelValue"
        :required="required === true"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :inputmode="inputmode"
        class="block w-full rounded-md border px-3 py-2 text-slate-900 shadow-sm outline-none focus:ring-2 disabled:bg-slate-100"
        :class="
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 focus:border-violet-500 focus:ring-violet-100'
        "
        :aria-invalid="error != null"
        :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
        @input="onInput"
      />
      <slot name="append" />
    </div>
    <p v-if="error" :id="`${id}-error`" class="text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-sm text-slate-500">{{ hint }}</p>
  </div>
</template>
