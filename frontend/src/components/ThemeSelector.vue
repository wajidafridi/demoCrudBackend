<script setup lang="ts">
import { useTheme } from '@/theme/useTheme'
import type { ResolvedTheme } from '@/theme/theme'

const theme = useTheme()

function choose(next: ResolvedTheme): void {
  theme.setPreference(next)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    choose('dark')
    return
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    choose('light')
  }
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
      Shows the current appearance. Light and Dark save an explicit choice.
    </p>
    <button
      type="button"
      role="radio"
      title="Light theme"
      aria-label="Light theme"
      :aria-checked="theme.resolvedTheme.value === 'light'"
      class="inline-flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      :class="
        theme.resolvedTheme.value === 'light'
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
      :aria-checked="theme.resolvedTheme.value === 'dark'"
      class="inline-flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      :class="
        theme.resolvedTheme.value === 'dark'
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
