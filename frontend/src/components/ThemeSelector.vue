<script setup lang="ts">
import { useTheme } from '@/theme/useTheme'
import type { ThemePreference } from '@/theme/theme'

const theme = useTheme()
const order: ThemePreference[] = ['light', 'dark', 'system']

function choose(next: ThemePreference): void {
  theme.setPreference(next)
}

function selected(preference: ThemePreference): boolean {
  return theme.preference.value === preference
}

function onKeydown(event: KeyboardEvent): void {
  const step =
    event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : 0
  if (step === 0) {
    return
  }

  event.preventDefault()
  const index = order.indexOf(theme.preference.value)
  const next = order[(index + step + order.length) % order.length] ?? 'system'
  choose(next)
}
</script>

<template>
  <div
    role="radiogroup"
    aria-label="Theme"
    aria-describedby="theme-toggle-hint"
    class="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-border bg-surface-secondary p-0.5"
    @keydown="onKeydown"
  >
    <p id="theme-toggle-hint" class="sr-only">
      System follows this device. Light and Dark save an explicit choice.
    </p>
    <button
      type="button"
      role="radio"
      title="System theme"
      aria-label="System theme"
      :aria-checked="selected('system')"
      class="inline-flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      :class="
        selected('system')
          ? 'bg-accent-solid text-accent-foreground'
          : 'text-foreground-secondary hover:text-foreground'
      "
      @click="choose('system')"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path stroke-linecap="round" d="M8 20h8M12 16v4" />
      </svg>
    </button>
    <button
      type="button"
      role="radio"
      title="Light theme"
      aria-label="Light theme"
      :aria-checked="selected('light')"
      class="inline-flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      :class="
        selected('light')
          ? 'bg-accent-solid text-accent-foreground'
          : 'text-foreground-secondary hover:text-foreground'
      "
      @click="choose('light')"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          stroke-linecap="round"
          d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        />
      </svg>
    </button>
    <button
      type="button"
      role="radio"
      title="Dark theme"
      aria-label="Dark theme"
      :aria-checked="selected('dark')"
      class="inline-flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      :class="
        selected('dark')
          ? 'bg-accent-solid text-accent-foreground'
          : 'text-foreground-secondary hover:text-foreground'
      "
      @click="choose('dark')"
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M20 14.5A7.5 7.5 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5Z"
        />
      </svg>
    </button>
  </div>
</template>
