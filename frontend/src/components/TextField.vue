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
    <label :for="id" class="block text-sm font-medium text-foreground">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
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
        class="block h-10 w-full rounded-lg border bg-surface px-3 text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        :class="
          error
            ? 'border-danger focus-visible:outline-danger'
            : 'border-border focus-visible:outline-focus'
        "
        :aria-invalid="error != null"
        :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
        @input="onInput"
      />
      <slot name="append" />
    </div>
    <p v-if="error" :id="`${id}-error`" class="text-sm text-danger">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="text-sm text-foreground-muted">{{ hint }}</p>
  </div>
</template>
