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
  <section class="mx-auto w-full min-w-0 max-w-xl space-y-6">
    <div class="space-y-3">
      <button
        type="button"
        class="text-sm font-semibold text-accent hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
        :disabled="submitting"
        @click="onCancel"
      >
        Back to roles
      </button>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">
          {{ mode === 'create' ? 'Create role' : 'Edit role' }}
        </h1>
        <p class="mt-2 text-sm text-foreground-secondary">
          {{
            mode === 'create'
              ? 'Name the role. Rights can be assigned after it exists.'
              : 'Update the role name. Rights stay on the Rights page.'
          }}
        </p>
      </div>
    </div>

    <p v-if="loading" class="text-sm text-foreground-secondary" role="status">Loading role…</p>

    <AlertBanner v-else-if="loadError" variant="error" :message="loadError" />

    <form
      v-else
      class="space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8"
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
          class="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting"
          @click="onCancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting"
          :aria-busy="submitting"
        >
          {{ submitting ? 'Saving…' : mode === 'create' ? 'Create role' : 'Save changes' }}
        </button>
      </div>
    </form>
  </section>
</template>
