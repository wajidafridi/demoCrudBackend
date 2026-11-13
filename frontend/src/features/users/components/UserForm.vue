<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import AlertBanner from '@/components/AlertBanner.vue'
import TextField from '@/components/TextField.vue'
import {
  fieldErrorMessage,
  toUserFormSubmission,
  validateUserForm,
  type UserFormField,
  type UserFormMode,
  type UserFormSubmission,
  type UserFormValues,
} from '@/features/users/userForm'

const props = defineProps<{
  mode: UserFormMode
  initialValues: UserFormValues
  roleName?: string | null
  submitting: boolean
  serverMessage: string | null
  serverFieldErrors: Record<string, string[]> | null
}>()

const emit = defineEmits<{
  submit: [payload: UserFormSubmission]
  cancel: []
}>()

const values = reactive<UserFormValues>({ ...props.initialValues })
const showPassword = ref(false)
const clientErrors = ref<Partial<Record<UserFormField, string>>>({})

const hasClientErrors = computed(() => Object.keys(clientErrors.value).length > 0)

const roleHint = computed(() => {
  const base = 'Enter the numeric id of an existing role. The system role cannot be assigned.'
  if (props.mode === 'edit' && props.roleName != null && props.roleName.trim().length > 0) {
    return `Current role: ${props.roleName}. ${base}`
  }

  return base
})

function errorFor(field: UserFormField): string | null {
  const clientError = clientErrors.value[field]
  if (clientError != null) {
    return clientError
  }

  if (hasClientErrors.value) {
    return null
  }

  return fieldErrorMessage(props.serverFieldErrors, field)
}

function onSubmit(): void {
  const snapshot: UserFormValues = { ...values }
  clientErrors.value = validateUserForm(snapshot, props.mode)
  if (Object.keys(clientErrors.value).length > 0) {
    return
  }

  emit('submit', toUserFormSubmission(snapshot, props.mode))
}
</script>

<template>
  <form class="space-y-6" novalidate @submit.prevent="onSubmit">
    <AlertBanner
      v-if="hasClientErrors"
      variant="error"
      message="Please correct the highlighted fields."
    />
    <AlertBanner v-else-if="serverMessage" variant="error" :message="serverMessage" />

    <div class="grid gap-5 sm:grid-cols-2">
      <TextField
        id="firstName"
        v-model="values.firstName"
        label="First name"
        required
        autocomplete="given-name"
        :maxlength="100"
        :disabled="submitting"
        :error="errorFor('firstName')"
      />
      <TextField
        id="lastName"
        v-model="values.lastName"
        label="Last name"
        required
        autocomplete="family-name"
        :maxlength="100"
        :disabled="submitting"
        :error="errorFor('lastName')"
      />
      <TextField
        id="email"
        v-model="values.email"
        label="Email"
        type="email"
        required
        autocomplete="email"
        inputmode="email"
        :maxlength="256"
        :disabled="submitting"
        :error="errorFor('email')"
      />
      <TextField
        id="userName"
        v-model="values.userName"
        label="Username"
        required
        autocomplete="username"
        :maxlength="100"
        :disabled="submitting"
        :error="errorFor('userName')"
      />
      <TextField
        v-if="mode === 'create'"
        id="password"
        v-model="values.password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        required
        autocomplete="new-password"
        :maxlength="100"
        :disabled="submitting"
        :error="errorFor('password')"
        hint="At least 6 characters."
      >
        <template #append>
          <button
            type="button"
            class="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-60"
            :disabled="submitting"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </template>
      </TextField>
      <TextField
        id="roleId"
        v-model="values.roleId"
        label="Role id"
        required
        inputmode="numeric"
        :disabled="submitting"
        :error="errorFor('roleId')"
        :hint="roleHint"
      />
      <TextField
        id="phoneNumber"
        v-model="values.phoneNumber"
        label="Phone number"
        type="tel"
        autocomplete="tel"
        :maxlength="50"
        :disabled="submitting"
        :error="errorFor('phoneNumber')"
      />
      <TextField
        id="gender"
        v-model="values.gender"
        label="Gender"
        :maxlength="50"
        :disabled="submitting"
        :error="errorFor('gender')"
      />
      <TextField
        id="dateOfBirth"
        v-model="values.dateOfBirth"
        label="Date of birth"
        type="date"
        autocomplete="bday"
        :disabled="submitting"
        :error="errorFor('dateOfBirth')"
      />
      <div class="sm:col-span-2">
        <TextField
          id="address"
          v-model="values.address"
          label="Address"
          autocomplete="street-address"
          :maxlength="500"
          :disabled="submitting"
          :error="errorFor('address')"
        />
      </div>
      <div class="sm:col-span-2">
        <TextField
          id="imageUrl"
          v-model="values.imageUrl"
          label="Image URL"
          type="url"
          autocomplete="url"
          inputmode="url"
          :maxlength="500"
          :disabled="submitting"
          :error="errorFor('imageUrl')"
        />
      </div>
    </div>

    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-60"
        :disabled="submitting"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:bg-violet-300"
        :disabled="submitting"
      >
        {{ submitting ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes' }}
      </button>
    </div>
  </form>
</template>
