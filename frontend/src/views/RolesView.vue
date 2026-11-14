<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { toApiClientError } from '@/services/apiError'
import { DEFAULT_PAGE_SIZE, TABLE_SCROLL_CLASS } from '@/constants/pagination'
import { deleteRole, listRoles } from '@/services/roleService'
import { useAuthStore } from '@/stores/authStore'
import type { PaginationMetadata } from '@/types/api'
import type { RoleResponse } from '@/types/role'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const roles = ref<RoleResponse[]>([])
const pagination = ref<PaginationMetadata | null>(null)
const pageNumber = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const deleteTarget = ref<RoleResponse | null>(null)
const deleting = ref(false)

const canCreate = computed(() => authStore.hasPermission('Role_Create'))
const canEdit = computed(() => authStore.hasPermission('Role_Edit'))
const canDelete = computed(() => authStore.hasPermission('Role_Delete'))
const canAssignRights = computed(() => authStore.hasPermission('RoleRight_Assign'))
const showActions = computed(() => canEdit.value || canDelete.value || canAssignRights.value)

const showEmpty = computed(
  () => !loading.value && errorMessage.value == null && roles.value.length === 0,
)

const deleteDialogMessage = computed(() => {
  const role = deleteTarget.value
  if (role == null) {
    return ''
  }

  return `This will permanently delete ${role.name}. This cannot be undone.`
})

async function loadRoles(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    let result = await listRoles({
      pageNumber: pageNumber.value,
      pageSize: pageSize.value,
    })

    if (
      result.roles.length === 0 &&
      result.pagination.totalPages > 0 &&
      pageNumber.value > result.pagination.totalPages
    ) {
      pageNumber.value = result.pagination.totalPages
      result = await listRoles({
        pageNumber: pageNumber.value,
        pageSize: pageSize.value,
      })
    }

    roles.value = result.roles
    pagination.value = result.pagination
  } catch (error: unknown) {
    roles.value = []
    pagination.value = null
    errorMessage.value = toApiClientError(error, 'Could not load roles.').message
  } finally {
    loading.value = false
  }
}

function readNotice(): 'created' | 'updated' | null {
  const notice = route.query.notice
  if (notice === 'created' || notice === 'updated') {
    return notice
  }

  return null
}

onMounted(async () => {
  const notice = readNotice()
  if (notice === 'created') {
    successMessage.value = 'Role created successfully.'
    await router.replace({ name: 'roles' })
  } else if (notice === 'updated') {
    successMessage.value = 'Role updated successfully.'
    await router.replace({ name: 'roles' })
  }

  await loadRoles()
})

async function onPageChange(nextPage: number): Promise<void> {
  if (loading.value || pagination.value == null || nextPage === pageNumber.value) {
    return
  }

  pageNumber.value = nextPage
  await loadRoles()
}

async function onPageSizeChange(nextSize: number): Promise<void> {
  if (loading.value || nextSize === pageSize.value) {
    return
  }

  pageSize.value = nextSize
  pageNumber.value = 1
  await loadRoles()
}

function askDelete(role: RoleResponse): void {
  if (!canDelete.value) {
    return
  }

  successMessage.value = null
  errorMessage.value = null
  deleteTarget.value = role
}

function cancelDelete(): void {
  if (deleting.value) {
    return
  }

  deleteTarget.value = null
}

async function confirmDelete(): Promise<void> {
  const role = deleteTarget.value
  if (role == null || deleting.value) {
    return
  }

  if (!canDelete.value) {
    // Rights can change while the dialog is open. Say why nothing was deleted.
    deleteTarget.value = null
    errorMessage.value = 'You no longer have permission to delete roles. Nothing was deleted.'
    return
  }

  deleting.value = true
  errorMessage.value = null

  try {
    const message = await deleteRole(role.id)
    successMessage.value = message || 'Role deleted successfully.'
    deleteTarget.value = null
    await loadRoles()
  } catch (error: unknown) {
    deleteTarget.value = null
    errorMessage.value = toApiClientError(error, 'Could not delete the role.').message
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-col gap-6">
    <div class="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">Roles</h1>
        <p class="mt-2 max-w-2xl text-sm text-foreground-secondary">
          Browse the roles you can manage. System roles are omitted from this list.
        </p>
      </div>
      <RouterLink
        v-if="canCreate"
        :to="{ name: 'roles-create' }"
        class="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-accent-solid px-4 text-sm font-semibold whitespace-nowrap text-accent-foreground hover:bg-accent-solid-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Create role
      </RouterLink>
    </div>

    <AlertBanner v-if="successMessage" variant="success" :message="successMessage" />

    <div v-if="errorMessage" class="space-y-3">
      <AlertBanner variant="error" :message="errorMessage" />
      <button
        type="button"
        class="h-10 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label="Try again"
        @click="loadRoles"
      >
        Try again
      </button>
    </div>

    <p v-if="loading" class="text-sm text-foreground-secondary" role="status">Loading roles…</p>

    <div
      v-else-if="showEmpty"
      class="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center"
    >
      <h2 class="text-lg font-semibold text-foreground">No roles found</h2>
      <p class="mt-1 text-sm text-foreground-secondary">There are no roles on this page.</p>
    </div>

    <div v-else-if="roles.length > 0" class="flex min-h-0 min-w-0 flex-col gap-4">
      <div class="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
        <div :class="[TABLE_SCROLL_CLASS, 'w-full max-w-full']">
          <table class="w-full min-w-[480px] text-left text-sm" aria-label="Roles">
            <thead
              class="sticky top-0 z-10 border-b border-border bg-surface-secondary text-xs tracking-wide text-foreground-muted uppercase"
            >
              <tr>
                <th scope="col" class="px-3 py-3 font-semibold">Name</th>
                <th v-if="showActions" scope="col" class="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-subtle">
              <tr
                v-for="role in roles"
                :key="role.id"
                class="text-foreground hover:bg-surface-secondary"
              >
                <td class="px-3 py-3.5 font-medium break-words">{{ role.name }}</td>
                <td v-if="showActions" class="px-3 py-3.5">
                  <div class="flex flex-wrap gap-2">
                    <RouterLink
                      v-if="canEdit"
                      :to="{ name: 'roles-edit', params: { id: role.id } }"
                      class="rounded-md border border-border px-2.5 py-1 text-sm font-semibold text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      :aria-label="`Edit ${role.name}`"
                    >
                      Edit
                    </RouterLink>
                    <RouterLink
                      v-if="canAssignRights"
                      :to="{ name: 'roles-rights', params: { id: role.id } }"
                      class="rounded-md border border-border px-2.5 py-1 text-sm font-semibold text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      :aria-label="`Manage rights for ${role.name}`"
                    >
                      Rights
                    </RouterLink>
                    <button
                      v-if="canDelete"
                      type="button"
                      class="rounded-md border border-border px-2.5 py-1 text-sm font-semibold text-danger hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      :aria-label="`Delete ${role.name}`"
                      @click="askDelete(role)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <PaginationControls
        v-if="pagination && pagination.totalCount > 0"
        class="shrink-0"
        :pagination="pagination"
        :page-size="pageSize"
        :disabled="loading"
        item-label="roles"
        @change="onPageChange"
        @update:page-size="onPageSizeChange"
      />
    </div>

    <ConfirmDialog
      :open="deleteTarget != null"
      title="Delete this role?"
      :message="deleteDialogMessage"
      confirm-label="Delete role"
      :busy="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </section>
</template>
