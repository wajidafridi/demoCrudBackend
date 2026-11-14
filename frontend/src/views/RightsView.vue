<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import RightsPanel from '@/features/rights/RightsPanel.vue'
import { parseRoleId } from '@/features/roles/roleForm'
import { getAccount } from '@/services/accountService'
import { toApiClientError } from '@/services/apiError'
import {
  assignRoleRights,
  getRoleRights,
  listAllRoles,
  removeRoleRights,
} from '@/services/roleService'
import { listAllRights } from '@/services/rightService'
import { useAuthStore } from '@/stores/authStore'
import type { RightResponse } from '@/types/right'
import type { RoleResponse } from '@/types/role'

const ACCESS_NOTE = 'Changes apply immediately, including to users who are already signed in.'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const rolesLoading = ref(true)
const rolesError = ref<string | null>(null)
const roles = ref<RoleResponse[]>([])
const selectedRoleId = ref<number | null>(null)

const rightsLoading = ref(false)
const assignedError = ref<string | null>(null)
const catalogError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const assigned = ref<RightResponse[]>([])
const catalog = ref<RightResponse[]>([])
const availableQuery = ref('')
const assignedQuery = ref('')
const availableSelection = ref<number[]>([])
const assignedSelection = ref<number[]>([])
const busy = ref(false)
const pendingAction = ref<'assign' | 'remove' | null>(null)
const confirmOpen = ref(false)
const confirmRoleId = ref<number | null>(null)
const confirmReason = ref<'own' | 'unknown' | null>(null)
const accountRoleId = ref<number | null>(null)
const accountStatus = ref<'loading' | 'ready' | 'error'>('loading')

let loadGeneration = 0

const canChange = computed(() => authStore.hasPermission('RoleRight_Assign'))
const controlsLocked = computed(() => busy.value || confirmOpen.value)

const sortedRoles = computed(() =>
  [...roles.value].sort((left, right) => left.name.localeCompare(right.name) || left.id - right.id),
)

const selectedRole = computed(
  () => sortedRoles.value.find((role) => role.id === selectedRoleId.value) ?? null,
)

const availableRights = computed(() => {
  const assignedIds = new Set(assigned.value.map((right) => right.id))
  return catalog.value.filter((right) => !assignedIds.has(right.id))
})

const filteredAvailable = computed(() => filterRights(availableRights.value, availableQuery.value))
const filteredAssigned = computed(() => filterRights(assigned.value, assignedQuery.value))

const availableEmptyMessage = computed(() => {
  if (availableQuery.value.trim().length > 0) {
    return 'No rights match this search.'
  }
  if (catalog.value.length === 0) {
    return 'No rights are visible in your access.'
  }
  return 'Every right you can see is already assigned to this role.'
})

const assignedEmptyMessage = computed(() =>
  assignedQuery.value.trim().length > 0
    ? 'No rights match this search.'
    : 'No assigned rights are visible for this role.',
)

const removeConfirmTitle = computed(() =>
  confirmReason.value === 'unknown' ? 'Confirm rights removal' : 'Remove your own rights?',
)

const removeConfirmMessage = computed(() => {
  const name = selectedRole.value?.name ?? 'this role'
  if (confirmReason.value === 'unknown') {
    return `Your role could not be verified, so this removal needs confirmation. Removing rights from ${name} may remove your own access immediately. ${ACCESS_NOTE}`
  }
  return `You are about to remove rights from ${name}, which is your own role. You could lose that access immediately. ${ACCESS_NOTE}`
})

function queryValue(): string | null {
  const raw = route.query.roleId
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value : null
}

function filterRights(rights: RightResponse[], query: string): RightResponse[] {
  const needle = query.trim().toLocaleLowerCase()
  const sorted = [...rights].sort(
    (left, right) => left.name.localeCompare(right.name) || left.id - right.id,
  )
  if (needle.length === 0) {
    return sorted
  }
  return sorted.filter((right) => right.name.toLocaleLowerCase().includes(needle))
}

function ownsRole(roleId: number): boolean {
  return accountStatus.value === 'ready' && accountRoleId.value === roleId
}

function syncRoleFromRoute(): void {
  if (sortedRoles.value.length === 0) {
    selectedRoleId.value = null
    return
  }

  const requested = parseRoleId(queryValue())
  const match = sortedRoles.value.find((role) => role.id === requested)
  const next = match ?? sortedRoles.value[0]
  if (next == null) {
    selectedRoleId.value = null
    return
  }

  selectedRoleId.value = next.id
  if (queryValue() !== String(next.id)) {
    void router.replace({ name: 'rights', query: { roleId: String(next.id) } })
  }
}

async function loadAccountRole(): Promise<void> {
  accountStatus.value = 'loading'
  accountRoleId.value = null
  try {
    const profile = await getAccount()
    accountRoleId.value = profile.roleId
    accountStatus.value = 'ready'
  } catch {
    accountRoleId.value = null
    accountStatus.value = 'error'
  }
}

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

async function loadRights(roleId: number): Promise<void> {
  const generation = ++loadGeneration
  rightsLoading.value = true
  assignedError.value = null
  catalogError.value = null
  assigned.value = []
  catalog.value = []

  try {
    const [assignedResult, catalogResult] = await Promise.allSettled([
      getRoleRights(roleId),
      listAllRights(),
    ])
    if (generation !== loadGeneration) {
      return
    }

    if (assignedResult.status === 'fulfilled') {
      assigned.value = assignedResult.value
    } else {
      assignedError.value = toApiClientError(
        assignedResult.reason,
        'Could not load role rights.',
      ).message
    }

    if (catalogResult.status === 'fulfilled') {
      catalog.value = catalogResult.value
    } else {
      catalogError.value = toApiClientError(catalogResult.reason, 'Could not load rights.').message
    }
  } finally {
    if (generation === loadGeneration) {
      rightsLoading.value = false
    }
  }
}

function resetSelections(): void {
  availableSelection.value = []
  assignedSelection.value = []
  availableQuery.value = ''
  assignedQuery.value = ''
  actionError.value = null
  successMessage.value = null
  confirmOpen.value = false
  confirmRoleId.value = null
  confirmReason.value = null
}

function selectionFor(panel: 'available' | 'assigned') {
  return panel === 'available' ? availableSelection : assignedSelection
}

function toggle(panel: 'available' | 'assigned', id: number): void {
  if (controlsLocked.value) {
    return
  }
  const selection = selectionFor(panel)
  selection.value = selection.value.includes(id)
    ? selection.value.filter((existing) => existing !== id)
    : [...selection.value, id]
}

function toggleAll(panel: 'available' | 'assigned', visible: RightResponse[]): void {
  if (controlsLocked.value) {
    return
  }
  const selection = selectionFor(panel)
  const visibleIds = visible.map((right) => right.id)
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selection.value.includes(id))
  if (allSelected) {
    const hidden = new Set(visibleIds)
    selection.value = selection.value.filter((id) => !hidden.has(id))
    return
  }
  selection.value = [...new Set([...selection.value, ...visibleIds])]
}

function onRoleChange(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLSelectElement) || controlsLocked.value) {
    return
  }
  const id = parseRoleId(target.value)
  if (id == null || id === selectedRoleId.value) {
    return
  }
  void router.replace({ name: 'rights', query: { roleId: String(id) } })
}

async function assignSelected(): Promise<void> {
  const roleId = selectedRoleId.value
  if (
    roleId == null ||
    controlsLocked.value ||
    !canChange.value ||
    availableSelection.value.length === 0 ||
    catalogError.value != null ||
    assignedError.value != null
  ) {
    return
  }

  busy.value = true
  pendingAction.value = 'assign'
  actionError.value = null
  successMessage.value = null
  const rightIds = [...availableSelection.value]
  try {
    await assignRoleRights(roleId, { rightIds })
    availableSelection.value = []
    successMessage.value = `Rights assigned. ${ACCESS_NOTE}`
    await loadRights(roleId)
  } catch (error: unknown) {
    actionError.value = toApiClientError(error, 'Could not assign rights.').message
  } finally {
    busy.value = false
    pendingAction.value = null
  }
}

function closeConfirm(): void {
  if (busy.value) {
    return
  }
  confirmOpen.value = false
  confirmRoleId.value = null
  confirmReason.value = null
}

function requestRemove(): void {
  const role = selectedRole.value
  if (
    role == null ||
    controlsLocked.value ||
    accountStatus.value === 'loading' ||
    !canChange.value ||
    assignedSelection.value.length === 0 ||
    assignedError.value != null
  ) {
    return
  }
  if (accountStatus.value === 'error' || ownsRole(role.id)) {
    confirmRoleId.value = role.id
    confirmReason.value = accountStatus.value === 'error' ? 'unknown' : 'own'
    confirmOpen.value = true
    return
  }
  void removeSelected()
}

async function removeSelected(): Promise<void> {
  const roleId = selectedRoleId.value
  if (
    roleId == null ||
    busy.value ||
    accountStatus.value === 'loading' ||
    !canChange.value ||
    assignedSelection.value.length === 0 ||
    assignedError.value != null
  ) {
    return
  }
  if (confirmRoleId.value != null && confirmRoleId.value !== roleId) {
    closeConfirm()
    return
  }

  busy.value = true
  pendingAction.value = 'remove'
  actionError.value = null
  successMessage.value = null
  const rightIds = [...assignedSelection.value]
  try {
    await removeRoleRights(roleId, { rightIds })
    if (selectedRoleId.value !== roleId) {
      return
    }
    assignedSelection.value = []
    confirmOpen.value = false
    confirmRoleId.value = null
    confirmReason.value = null
    successMessage.value = `Rights removed. ${ACCESS_NOTE}`
    await loadRights(roleId)
  } catch (error: unknown) {
    confirmOpen.value = false
    actionError.value = toApiClientError(error, 'Could not remove rights.').message
  } finally {
    busy.value = false
    pendingAction.value = null
  }
}

watch(
  () => [roles.value, queryValue()] as const,
  () => {
    syncRoleFromRoute()
  },
)

watch(selectedRoleId, (roleId, previous) => {
  if (roleId == null || roleId === previous) {
    return
  }
  resetSelections()
  void loadRights(roleId)
})

onMounted(() => {
  void loadRoles()
  void loadAccountRole()
})

onUnmounted(() => {
  loadGeneration += 1
})
</script>

<template>
  <div class="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">
    <header class="max-w-3xl">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">Rights Management</h1>
      <p class="mt-2 text-sm text-foreground-secondary">
        Choose a role, then assign or remove the rights you can see. These lists include only rights
        in your current access. The role may have other rights that are not shown.
      </p>
      <p class="mt-2 text-sm text-foreground-muted">{{ ACCESS_NOTE }}</p>
    </header>

    <AlertBanner v-if="rolesError != null" variant="error" :message="rolesError" />
    <AlertBanner v-if="actionError != null" variant="error" :message="actionError" />
    <AlertBanner v-if="successMessage != null" variant="success" :message="successMessage" />

    <section class="rounded-2xl border border-border bg-surface p-4">
      <p v-if="rolesLoading" role="status" class="text-sm text-foreground-secondary">
        Loading roles…
      </p>
      <p v-else-if="sortedRoles.length === 0" class="text-sm text-foreground-secondary">
        No roles are available to manage.
      </p>
      <label v-else class="block max-w-md">
        <span class="text-sm font-medium text-foreground">Role</span>
        <select
          :value="selectedRoleId ?? ''"
          :disabled="controlsLocked"
          aria-label="Role"
          class="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
          @change="onRoleChange"
        >
          <option v-for="role in sortedRoles" :key="role.id" :value="String(role.id)">
            {{ role.name }}
          </option>
        </select>
      </label>
      <p
        v-if="!rolesLoading && sortedRoles.length > 0 && !canChange"
        class="mt-3 text-sm text-foreground-secondary"
      >
        You can review the rights in your access. Changing assignments requires the RoleRight_Assign
        permission.
      </p>
    </section>

    <div v-if="selectedRole != null" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <RightsPanel
        heading-id="available-rights-heading"
        title="Available rights"
        :query="availableQuery"
        search-label="Search available rights"
        :rights="filteredAvailable"
        :total-count="availableRights.length"
        :selected-ids="availableSelection"
        :empty-message="availableEmptyMessage"
        action-label="Assign selected"
        pending-label="Assigning…"
        select-all-label="Select all filtered available rights"
        :can-select="canChange"
        :pending="pendingAction === 'assign'"
        :busy="controlsLocked"
        :loading="rightsLoading"
        :error="
          catalogError ??
          (assignedError != null
            ? 'Assigned rights could not be loaded, so available rights are hidden.'
            : null)
        "
        @update:query="availableQuery = $event"
        @toggle="toggle('available', $event)"
        @toggle-all="toggleAll('available', filteredAvailable)"
        @action="assignSelected"
      />
      <RightsPanel
        heading-id="assigned-rights-heading"
        title="Assigned rights"
        :query="assignedQuery"
        search-label="Search assigned rights"
        :rights="filteredAssigned"
        :total-count="assigned.length"
        :selected-ids="assignedSelection"
        :empty-message="assignedEmptyMessage"
        action-label="Remove selected"
        pending-label="Removing…"
        select-all-label="Select all filtered assigned rights"
        :can-select="canChange"
        tone="danger"
        :pending="pendingAction === 'remove'"
        :busy="controlsLocked"
        :loading="rightsLoading"
        :error="assignedError"
        :action-disabled="accountStatus === 'loading'"
        @update:query="assignedQuery = $event"
        @toggle="toggle('assigned', $event)"
        @toggle-all="toggleAll('assigned', filteredAssigned)"
        @action="requestRemove"
      />
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      :title="removeConfirmTitle"
      :message="removeConfirmMessage"
      confirm-label="Remove rights"
      busy-label="Removing…"
      :busy="busy"
      @confirm="removeSelected"
      @cancel="closeConfirm"
    />
  </div>
</template>
