<script setup lang="ts">
import { isThemePreference, type ThemePreference } from '@/theme/theme'
import { useTheme } from '@/theme/useTheme'

const theme = useTheme()

const labels: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

function onChange(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLSelectElement) || !isThemePreference(target.value)) {
    return
  }

  theme.setPreference(target.value)
}
</script>

<template>
  <label class="inline-flex shrink-0 items-center">
    <span class="sr-only">Theme</span>
    <select
      class="h-10 max-w-28 rounded-lg border border-border bg-surface-secondary px-2 text-sm font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      :value="theme.preference.value"
      @change="onChange"
    >
      <option v-for="mode in theme.modes" :key="mode" :value="mode">
        {{ labels[mode] }}
      </option>
    </select>
  </label>
</template>
