<script setup lang="ts">
defineProps<{
  name:
    | 'dashboard'
    | 'users'
    | 'roles'
    | 'rights'
    | 'account'
    | 'menu'
    | 'close'
    | 'logout'
    | 'bell'
    | 'chevron'
}>()
</script>

<template>
  <svg
    v-if="name === 'dashboard'"
    class="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
    />
  </svg>
  <svg
    v-else-if="name === 'users'"
    class="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8a3 3 0 1 1-2.83 4"
    />
  </svg>
  <svg
    v-else-if="name === 'roles'"
    class="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 3 4.5 6.5v5.2c0 4.4 3.1 8.4 7.5 9.3 4.4-.9 7.5-4.9 7.5-9.3V6.5L12 3Z"
    />
    <path stroke-linecap="round" stroke-linejoin="round" d="m9.5 12 1.7 1.7L14.8 10" />
  </svg>
  <svg
    v-else-if="name === 'rights'"
    class="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
    />
  </svg>
  <svg
    v-else-if="name === 'account'"
    class="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <path stroke-linecap="round" stroke-linejoin="round" d="M4 20a8 8 0 0 1 16 0" />
  </svg>
  <svg
    v-else-if="name === 'menu'"
    class="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
  </svg>
  <svg
    v-else-if="name === 'close'"
    class="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path stroke-linecap="round" d="m6 6 12 12M18 6 6 18" />
  </svg>
  <svg
    v-else-if="name === 'logout'"
    class="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M10 7V6a2 2 0 0 1 2-2h7v16h-7a2 2 0 0 1-2-2v-1"
    />
    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H4m0 0 3-3m-3 3 3 3" />
  </svg>
  <svg
    v-else-if="name === 'bell'"
    class="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M6.5 17h11l-1.2-1.2a2 2 0 0 1-.6-1.4V10a4.7 4.7 0 1 0-9.4 0v4.4a2 2 0 0 1-.6 1.4L6.5 17Z"
    />
    <path stroke-linecap="round" d="M10 19a2 2 0 0 0 4 0" />
  </svg>
  <svg
    v-else
    class="h-4 w-4 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d="m8 10 4 4 4-4" />
  </svg>
</template>
