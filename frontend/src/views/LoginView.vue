<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ThemeSelector from '@/components/ThemeSelector.vue'
import { useAuthStore } from '@/stores/authStore'
import { toLoginErrorMessage } from '@/utils/loginErrors'
import { resolveSafeInternalPath } from '@/utils/safeRedirect'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Prefill only for `vite`/`vite preview` development runs — not production or Vitest.
const useDevLoginPrefill = import.meta.env.MODE === 'development'
const username = ref(useDevLoginPrefill ? (import.meta.env.VITE_DEV_LOGIN_USERNAME ?? '') : '')
const password = ref(useDevLoginPrefill ? (import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? '') : '')
const showPassword = ref(false)
const isSubmitting = ref(false)
const formError = ref<string | null>(null)
const usernameError = ref<string | null>(null)
const passwordError = ref<string | null>(null)

function validate(): boolean {
  usernameError.value = null
  passwordError.value = null

  let isValid = true

  if (username.value.trim().length === 0) {
    usernameError.value = 'Username is required.'
    isValid = false
  }

  if (password.value.length === 0) {
    passwordError.value = 'Password is required.'
    isValid = false
  }

  return isValid
}

async function onSubmit(): Promise<void> {
  if (isSubmitting.value) {
    return
  }

  formError.value = null

  if (!validate()) {
    return
  }

  isSubmitting.value = true

  try {
    await authStore.login({
      username: username.value.trim(),
      password: password.value,
    })

    password.value = ''

    const destination = resolveSafeInternalPath(route.query.redirect, '/')
    await router.replace(destination)
  } catch (error: unknown) {
    formError.value = toLoginErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-page">
    <div class="flex justify-end px-4 pt-4 sm:px-6 sm:pt-6">
      <ThemeSelector />
    </div>

    <main class="flex flex-1 items-center justify-center px-4 py-8">
      <section
        class="w-full min-w-0 max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8"
      >
        <div class="space-y-2">
          <p class="text-sm font-semibold text-accent">Demo CRUD</p>
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
          <p class="text-sm text-foreground-secondary">
            Use your username and password to continue.
          </p>
        </div>

        <form class="mt-8 space-y-5" novalidate @submit.prevent="onSubmit">
          <div
            v-if="formError"
            class="rounded-lg border border-danger bg-danger-subtle px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {{ formError }}
          </div>

          <div class="space-y-1.5">
            <label for="username" class="block text-sm font-medium text-foreground">Username</label>
            <input
              id="username"
              v-model="username"
              type="text"
              name="username"
              autocomplete="username"
              :disabled="isSubmitting"
              class="block h-10 w-full rounded-lg border bg-surface px-3 text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:opacity-60"
              :class="
                usernameError
                  ? 'border-danger focus-visible:outline-danger'
                  : 'border-border focus-visible:outline-focus'
              "
              :aria-invalid="usernameError != null"
              :aria-describedby="usernameError ? 'username-error' : undefined"
            />
            <p v-if="usernameError" id="username-error" class="text-sm text-danger">
              {{ usernameError }}
            </p>
          </div>

          <div class="space-y-1.5">
            <label for="password" class="block text-sm font-medium text-foreground">Password</label>
            <div class="flex gap-2">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                :disabled="isSubmitting"
                class="block h-10 w-full rounded-lg border bg-surface px-3 text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:opacity-60"
                :class="
                  passwordError
                    ? 'border-danger focus-visible:outline-danger'
                    : 'border-border focus-visible:outline-focus'
                "
                :aria-invalid="passwordError != null"
                :aria-describedby="passwordError ? 'password-error' : undefined"
              />
              <button
                type="button"
                class="inline-flex h-10 shrink-0 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
                :disabled="isSubmitting"
                :aria-pressed="showPassword"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
            <p v-if="passwordError" id="password-error" class="text-sm text-danger">
              {{ passwordError }}
            </p>
          </div>

          <button
            type="submit"
            class="inline-flex h-10 w-full items-center justify-center rounded-lg bg-accent-solid px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-solid-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
          >
            <span
              v-if="isSubmitting"
              class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground border-r-transparent"
              aria-hidden="true"
            />
            {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </section>
    </main>
  </div>
</template>
