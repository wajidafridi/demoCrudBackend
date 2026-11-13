<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import UserForm from '@/features/users/components/UserForm.vue'
import {
  describeUserFormError,
  emptyUserForm,
  parseUserId,
  userToFormValues,
  type UserFormSubmission,
  type UserFormValues,
} from '@/features/users/userForm'
import { toApiClientError } from '@/services/apiError'
import { listAllRoles } from '@/services/roleService'
import { createUser, getUser, updateUser } from '@/services/userService'
import type { RoleResponse } from '@/types/role'

const route = useRoute()
const router = useRouter()

const mode = computed<'create' | 'edit'>(() => (route.name === 'users-edit' ? 'edit' : 'create'))
const loading = ref(mode.value === 'edit')
const loadError = ref<string | null>(null)
const formValues = ref<UserFormValues | null>(mode.value === 'create' ? emptyUserForm() : null)
const roleName = ref<string | null>(null)
const userId = ref<number | null>(null)
const submitting = ref(false)
const serverMessage = ref<string | null>(null)
const serverFieldErrors = ref<Record<string, string[]> | null>(null)
const roles = ref<RoleResponse[]>([])
const rolesLoading = ref(true)
const rolesError = ref<string | null>(null)

async function loadRoles(): Promise<void> {
  rolesLoading.value = true
  rolesError.value = null

  try {
    roles.value = await listAllRoles()
  } catch (error: unknown) {
    roles.value = []
    rolesError.value = toApiClientError(error, 'Could not load roles.').message
  } finally {
    rolesLoading.value = false
  }
}

onMounted(() => {
  void loadRoles()

  if (mode.value !== 'edit') {
    return
  }

  void loadUser()
})

async function loadUser(): Promise<void> {
  const id = parseUserId(route.params.id)
  if (id == null) {
    loadError.value = 'This user link is invalid.'
    loading.value = false
    return
  }

  userId.value = id

  try {
    const user = await getUser(id)
    formValues.value = userToFormValues(user)
    roleName.value = user.roleName
  } catch (error: unknown) {
    loadError.value = toApiClientError(error, 'Could not load the user.').message
  } finally {
    loading.value = false
  }
}

function onCancel(): void {
  if (submitting.value) {
    return
  }

  void router.push({ name: 'users' })
}

async function onSubmit(payload: UserFormSubmission): Promise<void> {
  if (submitting.value) {
    return
  }

  serverMessage.value = null
  serverFieldErrors.value = null
  submitting.value = true
  let notice: 'created' | 'updated' | null = null

  try {
    if (payload.mode === 'create') {
      await createUser(payload.body)
      notice = 'created'
    } else if (userId.value == null) {
      serverMessage.value = 'This user link is invalid.'
    } else {
      await updateUser(userId.value, payload.body)
      notice = 'updated'
    }
  } catch (error: unknown) {
    const apiError = toApiClientError(
      error,
      payload.mode === 'create' ? 'Could not create the user.' : 'Could not update the user.',
    )
    serverMessage.value = describeUserFormError(apiError.message, apiError.fieldErrors)
    serverFieldErrors.value = apiError.fieldErrors
  } finally {
    submitting.value = false
  }

  if (notice != null) {
    await router.push({ name: 'users', query: { notice } })
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-4">
    <button
      type="button"
      class="text-sm font-semibold text-accent hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
      :disabled="submitting"
      @click="onCancel"
    >
      Back to users
    </button>

    <p v-if="loading" class="text-sm text-foreground-secondary" role="status">Loading user…</p>

    <AlertBanner v-else-if="loadError" variant="error" :message="loadError" />

    <div v-else-if="formValues" class="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <UserForm
        :mode="mode"
        :initial-values="formValues"
        :role-name="roleName"
        :roles="roles"
        :roles-loading="rolesLoading"
        :roles-error="rolesError"
        :submitting="submitting"
        :server-message="serverMessage"
        :server-field-errors="serverFieldErrors"
        @submit="onSubmit"
        @cancel="onCancel"
      />
    </div>
  </section>
</template>
