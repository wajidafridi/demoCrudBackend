<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import { parseRoleId } from '@/features/roles/roleForm'
import { toApiClientError } from '@/services/apiError'
import { assignRoleRights, getRole, getRoleRights, removeRoleRights } from '@/services/roleService'
import { listAllRights } from '@/services/rightService'
import { useAuthStore } from '@/stores/authStore'
import type { RightResponse } from '@/types/right'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const loadError = ref<string | null>(null)
const catalogError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const roleName = ref('')
const roleId = ref<number | null>(null)
const assigned = ref<RightResponse[]>([])
const catalog = ref<RightResponse[]>([])
const pendingRightId = ref<number | null>(null)

const canAssign = computed(() => authStore.hasPermission('RoleRight_Assign'))
const canViewCatalog = computed(() => authStore.hasPermission('Right_View'))

const available = computed(() => {
  const assignedIds = new Set(assigned.value.map((right) => right.id))
  return catalog.value.filter((right) => !assignedIds.has(right.id))
})

const sortedAssigned = computed(() =>
  [...assigned.value].sort((left, right) => left.name.localeCompare(right.name)),
)

onMounted(async () => {
  const id = parseRoleId(route.params.id)
  if (id == null) {
    loadError.value = 'This role link is invalid.'
    loading.value = false
    return
  }

  roleId.value = id

  try {
    const [role, rights] = await Promise.all([getRole(id), getRoleRights(id)])
    roleName.value = role.name
    assigned.value = rights
  } catch (error: unknown) {
    loadError.value = toApiClientError(error, 'Could not load role rights.').message
    loading.value = false
    return
  }

  if (canViewCatalog.value) {
    try {
      catalog.value = await listAllRights()
    } catch (error: unknown) {
      catalogError.value = toApiClientError(error, 'Could not load rights.').message
    }
  } else {
    catalogError.value = 'You need the Right_View permission to see rights that can be assigned.'
  }

  loading.value = false
})

function onBack(): void {
  void router.push({ name: 'roles' })
}

async function assignRight(right: RightResponse): Promise<void> {
  if (roleId.value == null || pendingRightId.value != null || !canAssign.value) {
    return
  }

  pendingRightId.value = right.id
  actionError.value = null
  successMessage.value = null

  try {
    assigned.value = await assignRoleRights(roleId.value, { rightIds: [right.id] })
    successMessage.value = `${right.name} assigned.`
  } catch (error: unknown) {
    actionError.value = toApiClientError(error, 'Could not assign rights.').message
  } finally {
    pendingRightId.value = null
  }
}

async function removeRight(right: RightResponse): Promise<void> {
  if (roleId.value == null || pendingRightId.value != null || !canAssign.value) {
    return
  }

  pendingRightId.value = right.id
  actionError.value = null
  successMessage.value = null

  try {
    assigned.value = await removeRoleRights(roleId.value, { rightIds: [right.id] })
    successMessage.value = `${right.name} removed.`
  } catch (error: unknown) {
    actionError.value = toApiClientError(error, 'Could not remove rights.').message
  } finally {
    pendingRightId.value = null
  }
}
</script>

<template>
  <section class="mx-auto max-w-4xl space-y-4">
    <button
      type="button"
      class="text-sm font-semibold text-accent hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      @click="onBack"
    >
      Back to roles
    </button>

    <p v-if="loading" class="text-sm text-foreground-secondary" role="status">
      Loading role rights…
    </p>

    <AlertBanner v-else-if="loadError" variant="error" :message="loadError" />

    <template v-else>
      <div class="space-y-1">
        <h2 class="text-xl font-semibold tracking-tight text-foreground">{{ roleName }}</h2>
        <p class="text-sm text-foreground-secondary">
          Rights you can see for this role. The server only returns rights included in your own
          access.
        </p>
      </div>

      <AlertBanner v-if="successMessage" variant="success" :message="successMessage" />
      <AlertBanner v-if="actionError" variant="error" :message="actionError" />
      <AlertBanner v-if="catalogError" variant="error" :message="catalogError" />

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="rounded-2xl border border-border bg-surface p-5">
          <h3 class="text-sm font-semibold tracking-wide text-foreground-muted uppercase">
            Assigned
          </h3>
          <p v-if="sortedAssigned.length === 0" class="mt-3 text-sm text-foreground-secondary">
            This role has no rights you can see.
          </p>
          <ul v-else class="mt-3 divide-y divide-border-subtle">
            <li
              v-for="right in sortedAssigned"
              :key="right.id"
              class="flex items-center justify-between gap-3 py-2"
            >
              <span class="text-sm font-medium text-foreground">{{ right.name }}</span>
              <button
                v-if="canAssign"
                type="button"
                class="rounded-md px-2 py-1 text-sm font-semibold text-danger hover:bg-danger-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
                :disabled="pendingRightId != null"
                :aria-label="`Remove ${right.name}`"
                @click="removeRight(right)"
              >
                {{ pendingRightId === right.id ? 'Removing…' : 'Remove' }}
              </button>
            </li>
          </ul>
        </section>

        <section class="rounded-2xl border border-border bg-surface p-5">
          <h3 class="text-sm font-semibold tracking-wide text-foreground-muted uppercase">
            Available
          </h3>
          <p v-if="catalogError" class="mt-3 text-sm text-foreground-secondary">
            Available rights could not be loaded.
          </p>
          <p v-else-if="available.length === 0" class="mt-3 text-sm text-foreground-secondary">
            No further rights are available to assign.
          </p>
          <ul v-else class="mt-3 divide-y divide-border-subtle">
            <li
              v-for="right in available"
              :key="right.id"
              class="flex items-center justify-between gap-3 py-2"
            >
              <span class="text-sm font-medium text-foreground">{{ right.name }}</span>
              <button
                v-if="canAssign"
                type="button"
                class="rounded-md px-2 py-1 text-sm font-semibold text-accent hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
                :disabled="pendingRightId != null"
                :aria-label="`Assign ${right.name}`"
                @click="assignRight(right)"
              >
                {{ pendingRightId === right.id ? 'Assigning…' : 'Assign' }}
              </button>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </section>
</template>
