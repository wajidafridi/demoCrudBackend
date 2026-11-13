<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/authStore'
import { toLoginErrorMessage } from '@/utils/loginErrors'
import { resolveSafeInternalPath } from '@/utils/safeRedirect'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const username = ref(import.meta.env.DEV ? (import.meta.env.VITE_DEV_LOGIN_USERNAME ?? '') : '')
const password = ref(import.meta.env.DEV ? (import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? '') : '')
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
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
    <section
      class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div class="space-y-1">
        <p class="text-sm font-medium text-slate-500">Demo CRUD</p>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p class="text-sm text-slate-600">Use your account credentials to continue.</p>
      </div>

      <form class="mt-8 space-y-5" novalidate @submit.prevent="onSubmit">
        <div
          v-if="formError"
          class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {{ formError }}
        </div>

        <div class="space-y-1.5">
          <label for="username" class="block text-sm font-medium text-slate-700">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            name="username"
            autocomplete="username"
            :disabled="isSubmitting"
            class="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
            :aria-invalid="usernameError != null"
            :aria-describedby="usernameError ? 'username-error' : undefined"
          />
          <p v-if="usernameError" id="username-error" class="text-sm text-red-600">
            {{ usernameError }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label for="password" class="block text-sm font-medium text-slate-700">Password</label>
          <div class="flex gap-2">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              :disabled="isSubmitting"
              class="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              :aria-invalid="passwordError != null"
              :aria-describedby="passwordError ? 'password-error' : undefined"
            />
            <button
              type="button"
              class="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-60"
              :disabled="isSubmitting"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
          <p v-if="passwordError" id="password-error" class="text-sm text-red-600">
            {{ passwordError }}
          </p>
        </div>

        <button
          type="submit"
          class="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:bg-slate-400"
          :disabled="isSubmitting"
        >
          <span
            v-if="isSubmitting"
            class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"
            aria-hidden="true"
          />
          {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </section>
  </div>
</template>
