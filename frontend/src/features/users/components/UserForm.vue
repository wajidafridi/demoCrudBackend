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
import type { RoleResponse } from '@/types/role'

const props = defineProps<{
  mode: UserFormMode
  initialValues: UserFormValues
  roleName?: string | null
  roles: RoleResponse[]
  rolesLoading: boolean
  rolesError: string | null
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

const preservedRole = computed(() => {
  if (props.mode !== 'edit' || props.rolesLoading || props.rolesError != null) {
    return null
  }

  const currentId = values.roleId.trim()
  if (currentId.length === 0 || props.roles.some((role) => String(role.id) === currentId)) {
    return null
  }

  const name = props.roleName?.trim()
  return {
    id: Number(currentId),
    name: name != null && name.length > 0 ? name : `Role ${currentId}`,
  }
})

/** The current role is hidden by the roles API, so it cannot be swapped for another role. */
const roleLocked = computed(() => preservedRole.value != null)

const roleChoices = computed(() => {
  if (preservedRole.value != null) {
    return [preservedRole.value]
  }

  return props.roles
})

const roleHint = computed(() => {
  if (props.rolesLoading) {
    return 'Loading roles…'
  }

  if (roleLocked.value) {
    return 'This role is protected and cannot be changed.'
  }

  if (props.rolesError == null && props.roles.length === 0) {
    return 'No roles are available to assign.'
  }

  return null
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
        hint="At least 8 characters."
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
      <div class="space-y-1.5">
        <label for="roleId" class="block text-sm font-medium text-slate-700">
          Role
          <span class="text-red-600">*</span>
        </label>
        <select
          id="roleId"
          v-model="values.roleId"
          name="roleId"
          required
          class="block w-full rounded-md border px-3 py-2 text-slate-900 shadow-sm outline-none focus:ring-2 disabled:bg-slate-100"
          :class="
            errorFor('roleId') || rolesError
              ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
              : 'border-slate-300 focus:border-violet-500 focus:ring-violet-100'
          "
          :disabled="submitting || rolesLoading || roleLocked"
          :aria-invalid="errorFor('roleId') != null || rolesError != null"
          :aria-describedby="
            errorFor('roleId')
              ? 'roleId-error'
              : rolesError
                ? 'roleId-load-error'
                : roleHint
                  ? 'roleId-hint'
                  : undefined
          "
        >
          <option v-if="!roleLocked" value="" disabled>Select a role</option>
          <option v-for="role in roleChoices" :key="role.id" :value="String(role.id)">
            {{ role.name }}
          </option>
        </select>
        <p v-if="errorFor('roleId')" id="roleId-error" class="text-sm text-red-600">
          {{ errorFor('roleId') }}
        </p>
        <p v-else-if="rolesError" id="roleId-load-error" class="text-sm text-red-600">
          {{ rolesError }}
        </p>
        <p v-else-if="roleHint" id="roleId-hint" class="text-sm text-slate-500">{{ roleHint }}</p>
      </div>
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
