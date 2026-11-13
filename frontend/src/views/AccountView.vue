<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import NavIcons from '@/components/icons/NavIcons.vue'
import TextField from '@/components/TextField.vue'
import {
  emptyAccountForm,
  emptyPasswordForm,
  profileToForm,
  readFieldError,
  toUpdateAccountRequest,
  validateAccountForm,
  validatePasswordForm,
  type AccountField,
  type AccountFormValues,
  type PasswordField,
  type PasswordFormValues,
} from '@/features/account/accountForm'
import { changePassword, getAccount, updateAccount } from '@/services/accountService'
import { toApiClientError } from '@/services/apiError'
import { useAuthStore } from '@/stores/authStore'
import type { AccountProfile } from '@/types/account'

const authStore = useAuthStore()
const router = useRouter()

const profile = ref<AccountProfile | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const imageFailed = ref(false)

const form = ref<AccountFormValues>(emptyAccountForm())
const savedForm = ref<AccountFormValues>(emptyAccountForm())
const savedImageUrl = ref<string | null>(null)
const profileErrors = ref<Partial<Record<AccountField, string>>>({})
const profileBanner = ref<string | null>(null)
const profileNotice = ref<string | null>(null)
const savingProfile = ref(false)

const passwordForm = ref<PasswordFormValues>(emptyPasswordForm())
const passwordErrors = ref<Partial<Record<PasswordField, string>>>({})
const passwordBanner = ref<string | null>(null)
const passwordNotice = ref<string | null>(null)
const savingPassword = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const displayName = computed(() => {
  const current = profile.value
  if (current == null) {
    return ''
  }

  const full = `${current.firstName} ${current.lastName}`.trim()
  return full.length > 0 ? full : current.userName
})

const initials = computed(() => {
  const parts = displayName.value.split(/\s+/).filter((part) => part.length > 0)
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
  }

  return displayName.value.slice(0, 2).toUpperCase()
})

const showImage = computed(() => {
  const url = profile.value?.imageUrl
  return url != null && url.trim().length > 0 && !imageFailed.value
})

function applyProfile(next: AccountProfile): void {
  profile.value = next
  imageFailed.value = false
  const values = profileToForm(next)
  form.value = values
  savedForm.value = { ...values }
  savedImageUrl.value = next.imageUrl
}

async function loadProfile(): Promise<void> {
  loading.value = true
  loadError.value = null

  try {
    applyProfile(await getAccount())
  } catch (error: unknown) {
    profile.value = null
    loadError.value = toApiClientError(error, 'Could not load your account.').message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadProfile()
})

function profileError(field: AccountField): string | null {
  return profileErrors.value[field] ?? null
}

function passwordError(field: PasswordField): string | null {
  return passwordErrors.value[field] ?? null
}

function resetProfile(): void {
  if (savingProfile.value) {
    return
  }

  form.value = { ...savedForm.value }
  profileErrors.value = {}
  profileBanner.value = null
}

async function saveProfile(): Promise<void> {
  if (savingProfile.value || profile.value == null) {
    return
  }

  const errors = validateAccountForm(form.value)
  profileErrors.value = errors
  profileNotice.value = null
  if (Object.keys(errors).length > 0) {
    profileBanner.value = 'Please correct the highlighted fields.'
    return
  }

  profileBanner.value = null
  savingProfile.value = true

  try {
    const updated = await updateAccount(toUpdateAccountRequest(form.value, savedImageUrl.value))
    applyProfile(updated)
    profileNotice.value = 'Account updated successfully.'
  } catch (error: unknown) {
    const apiError = toApiClientError(error, 'Could not update your account.')
    profileBanner.value = apiError.message
    profileErrors.value = {
      firstName: readFieldError(apiError.fieldErrors, 'firstName') ?? undefined,
      lastName: readFieldError(apiError.fieldErrors, 'lastName') ?? undefined,
      email: readFieldError(apiError.fieldErrors, 'email') ?? undefined,
      phoneNumber: readFieldError(apiError.fieldErrors, 'phoneNumber') ?? undefined,
      gender: readFieldError(apiError.fieldErrors, 'gender') ?? undefined,
      dateOfBirth: readFieldError(apiError.fieldErrors, 'dateOfBirth') ?? undefined,
      address: readFieldError(apiError.fieldErrors, 'address') ?? undefined,
    }
  } finally {
    savingProfile.value = false
  }
}

function clearPasswordFields(): void {
  passwordForm.value = emptyPasswordForm()
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
}

async function savePassword(): Promise<void> {
  if (savingPassword.value) {
    return
  }

  const errors = validatePasswordForm(passwordForm.value)
  passwordErrors.value = errors
  passwordNotice.value = null
  if (Object.keys(errors).length > 0) {
    passwordBanner.value = 'Please correct the highlighted fields.'
    return
  }

  passwordBanner.value = null
  savingPassword.value = true
  const request = {
    currentPassword: passwordForm.value.currentPassword,
    newPassword: passwordForm.value.newPassword,
  }

  try {
    const message = await changePassword(request)
    clearPasswordFields()
    passwordErrors.value = {}
    passwordNotice.value = message || 'Password changed successfully.'
  } catch (error: unknown) {
    const apiError = toApiClientError(error, 'Could not change your password.')
    passwordBanner.value = apiError.message
    passwordErrors.value = {
      currentPassword: readFieldError(apiError.fieldErrors, 'currentPassword') ?? undefined,
      newPassword: readFieldError(apiError.fieldErrors, 'newPassword') ?? undefined,
    }
  } finally {
    savingPassword.value = false
  }
}

async function onLogout(): Promise<void> {
  authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <section class="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">My Account</h1>
      <p class="mt-2 max-w-2xl text-sm text-foreground-secondary">
        Review your profile, update personal details, and change your password.
      </p>
    </header>

    <p v-if="loading" class="text-sm text-foreground-secondary" role="status">Loading account…</p>

    <div v-else-if="loadError" class="space-y-3">
      <AlertBanner variant="error" :message="loadError" />
      <button
        type="button"
        class="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label="Try again"
        @click="loadProfile"
      >
        Try again
      </button>
    </div>

    <template v-else-if="profile">
      <article class="rounded-2xl border border-border bg-surface p-6">
        <h2 class="text-lg font-semibold text-foreground">Profile</h2>
        <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            v-if="showImage"
            :src="profile.imageUrl ?? undefined"
            :alt="displayName"
            class="h-16 w-16 rounded-full border border-border object-cover"
            @error="imageFailed = true"
          />
          <div
            v-else
            class="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground"
            aria-hidden="true"
          >
            {{ initials }}
          </div>
          <div class="min-w-0 space-y-2">
            <p class="truncate text-xl font-semibold text-foreground">{{ displayName }}</p>
            <p class="truncate text-sm text-foreground-secondary">{{ profile.email }}</p>
            <div class="flex flex-wrap gap-2">
              <span
                class="inline-flex rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-foreground-secondary"
              >
                {{ profile.userName }}
              </span>
              <span
                class="inline-flex rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-accent"
              >
                {{ profile.roleName ?? 'Role unavailable' }}
              </span>
              <span
                v-if="profile.isSystem"
                class="inline-flex rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-warning"
              >
                System
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          @click="onLogout"
        >
          <NavIcons name="logout" />
          Log out
        </button>
      </article>

      <form
        id="profile-form"
        class="space-y-6 rounded-2xl border border-border bg-surface p-6"
        novalidate
        @submit.prevent="saveProfile"
      >
        <div>
          <h2 class="text-lg font-semibold text-foreground">Personal information</h2>
          <p class="mt-1 text-sm text-foreground-secondary">
            Username, role, and system status are not edited here.
          </p>
        </div>

        <AlertBanner v-if="profileNotice" variant="success" :message="profileNotice" />
        <AlertBanner v-if="profileBanner" variant="error" :message="profileBanner" />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            id="firstName"
            v-model="form.firstName"
            label="First name"
            required
            autocomplete="given-name"
            :maxlength="100"
            :disabled="savingProfile"
            :error="profileError('firstName')"
          />
          <TextField
            id="lastName"
            v-model="form.lastName"
            label="Last name"
            required
            autocomplete="family-name"
            :maxlength="100"
            :disabled="savingProfile"
            :error="profileError('lastName')"
          />
          <div class="sm:col-span-2">
            <TextField
              id="email"
              v-model="form.email"
              label="Email"
              type="email"
              required
              autocomplete="email"
              :maxlength="256"
              :disabled="savingProfile"
              :error="profileError('email')"
            />
          </div>
          <TextField
            id="phoneNumber"
            v-model="form.phoneNumber"
            label="Phone number"
            type="tel"
            autocomplete="tel"
            :maxlength="50"
            :disabled="savingProfile"
            :error="profileError('phoneNumber')"
          />
          <TextField
            id="gender"
            v-model="form.gender"
            label="Gender"
            :maxlength="50"
            :disabled="savingProfile"
            :error="profileError('gender')"
          />
          <TextField
            id="dateOfBirth"
            v-model="form.dateOfBirth"
            label="Date of birth"
            type="date"
            autocomplete="bday"
            :disabled="savingProfile"
            :error="profileError('dateOfBirth')"
          />
          <div class="sm:col-span-2">
            <TextField
              id="address"
              v-model="form.address"
              label="Address"
              autocomplete="street-address"
              :maxlength="500"
              :disabled="savingProfile"
              :error="profileError('address')"
            />
          </div>
        </div>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingProfile"
            @click="resetProfile"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingProfile"
            :aria-busy="savingProfile"
          >
            {{ savingProfile ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </form>

      <form
        id="password-form"
        class="space-y-6 rounded-2xl border border-border bg-surface p-6"
        novalidate
        @submit.prevent="savePassword"
      >
        <div>
          <h2 class="text-lg font-semibold text-foreground">Password</h2>
          <p class="mt-1 text-sm text-foreground-secondary">
            Choose a new password between 8 and 100 characters. Current sessions stay signed in
            until their access tokens expire.
          </p>
        </div>

        <AlertBanner v-if="passwordNotice" variant="success" :message="passwordNotice" />
        <AlertBanner v-if="passwordBanner" variant="error" :message="passwordBanner" />

        <TextField
          id="currentPassword"
          v-model="passwordForm.currentPassword"
          label="Current password"
          :type="showCurrentPassword ? 'text' : 'password'"
          required
          autocomplete="current-password"
          :maxlength="100"
          :disabled="savingPassword"
          :error="passwordError('currentPassword')"
        >
          <template #append>
            <button
              type="button"
              class="inline-flex h-10 shrink-0 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
              :disabled="savingPassword"
              :aria-pressed="showCurrentPassword"
              :aria-label="showCurrentPassword ? 'Hide current password' : 'Show current password'"
              @click="showCurrentPassword = !showCurrentPassword"
            >
              {{ showCurrentPassword ? 'Hide' : 'Show' }}
            </button>
          </template>
        </TextField>
        <TextField
          id="newPassword"
          v-model="passwordForm.newPassword"
          label="New password"
          :type="showNewPassword ? 'text' : 'password'"
          required
          autocomplete="new-password"
          :maxlength="100"
          :disabled="savingPassword"
          :error="passwordError('newPassword')"
          hint="8 to 100 characters."
        >
          <template #append>
            <button
              type="button"
              class="inline-flex h-10 shrink-0 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
              :disabled="savingPassword"
              :aria-pressed="showNewPassword"
              :aria-label="showNewPassword ? 'Hide new password' : 'Show new password'"
              @click="showNewPassword = !showNewPassword"
            >
              {{ showNewPassword ? 'Hide' : 'Show' }}
            </button>
          </template>
        </TextField>
        <TextField
          id="confirmPassword"
          v-model="passwordForm.confirmPassword"
          label="Confirm new password"
          :type="showConfirmPassword ? 'text' : 'password'"
          required
          autocomplete="new-password"
          :maxlength="100"
          :disabled="savingPassword"
          :error="passwordError('confirmPassword')"
        >
          <template #append>
            <button
              type="button"
              class="inline-flex h-10 shrink-0 items-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
              :disabled="savingPassword"
              :aria-pressed="showConfirmPassword"
              :aria-label="showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              {{ showConfirmPassword ? 'Hide' : 'Show' }}
            </button>
          </template>
        </TextField>

        <div class="flex justify-end">
          <button
            type="submit"
            class="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingPassword"
            :aria-busy="savingPassword"
          >
            {{ savingPassword ? 'Updating…' : 'Update password' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>
