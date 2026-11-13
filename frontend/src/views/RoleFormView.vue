<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import TextField from '@/components/TextField.vue'
import {
  describeRoleError,
  parseRoleId,
  roleNameError,
  toRoleRequest,
  validateRoleName,
} from '@/features/roles/roleForm'
import { toApiClientError } from '@/services/apiError'
import { createRole, getRole, updateRole } from '@/services/roleService'

const route = useRoute()
const router = useRouter()

const mode = computed<'create' | 'edit'>(() => (route.name === 'roles-edit' ? 'edit' : 'create'))
const loading = ref(mode.value === 'edit')
const loadError = ref<string | null>(null)
const name = ref('')
const roleId = ref<number | null>(null)
const submitting = ref(false)
const clientError = ref<string | null>(null)
const serverMessage = ref<string | null>(null)
const serverFieldErrors = ref<Record<string, string[]> | null>(null)

const nameError = computed(() => clientError.value ?? roleNameError(serverFieldErrors.value))

onMounted(async () => {
  if (mode.value !== 'edit') {
    return
  }

  const id = parseRoleId(route.params.id)
  if (id == null) {
    loadError.value = 'This role link is invalid.'
    loading.value = false
    return
  }

  roleId.value = id

  try {
    const role = await getRole(id)
    name.value = role.name
  } catch (error: unknown) {
    loadError.value = toApiClientError(error, 'Could not load the role.').message
  } finally {
    loading.value = false
  }
})

function onCancel(): void {
  if (submitting.value) {
    return
  }

  void router.push({ name: 'roles' })
}

async function onSubmit(): Promise<void> {
  if (submitting.value) {
    return
  }

  clientError.value = validateRoleName(name.value)
  if (clientError.value != null) {
    return
  }

  serverMessage.value = null
  serverFieldErrors.value = null
  submitting.value = true
  let notice: 'created' | 'updated' | null = null

  try {
    const body = toRoleRequest(name.value)
    if (mode.value === 'create') {
      await createRole(body)
      notice = 'created'
    } else if (roleId.value == null) {
      serverMessage.value = 'This role link is invalid.'
    } else {
      await updateRole(roleId.value, body)
      notice = 'updated'
    }
  } catch (error: unknown) {
    const apiError = toApiClientError(
      error,
      mode.value === 'create' ? 'Could not create the role.' : 'Could not update the role.',
    )
    serverMessage.value = describeRoleError(apiError.message, apiError.fieldErrors)
    serverFieldErrors.value = apiError.fieldErrors
    clientError.value = null
  } finally {
    submitting.value = false
  }

  if (notice != null) {
    await router.push({ name: 'roles', query: { notice } })
  }
}
</script>

<template>
  <section class="mx-auto max-w-xl space-y-4">
    <button
      type="button"
      class="text-sm font-semibold text-violet-700 hover:text-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-60"
      :disabled="submitting"
      @click="onCancel"
    >
      Back to roles
    </button>

    <p v-if="loading" class="text-sm text-slate-600" role="status">Loading role…</p>

    <AlertBanner v-else-if="loadError" variant="error" :message="loadError" />

    <form
      v-else
      class="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      novalidate
      @submit.prevent="onSubmit"
    >
      <AlertBanner
        v-if="clientError"
        variant="error"
        message="Please correct the highlighted fields."
      />
      <AlertBanner v-else-if="serverMessage" variant="error" :message="serverMessage" />

      <TextField
        id="roleName"
        v-model="name"
        label="Role name"
        required
        autocomplete="off"
        :maxlength="100"
        :disabled="submitting"
        :error="nameError"
      />

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-60"
          :disabled="submitting"
          @click="onCancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:bg-violet-300"
          :disabled="submitting"
        >
          {{ submitting ? 'Saving…' : mode === 'create' ? 'Create role' : 'Save changes' }}
        </button>
      </div>
    </form>
  </section>
</template>
