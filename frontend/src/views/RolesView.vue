<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { toApiClientError } from '@/services/apiError'
import { deleteRole, listRoles, ROLES_PAGE_SIZE } from '@/services/roleService'
import { useAuthStore } from '@/stores/authStore'
import type { PaginationMetadata } from '@/types/api'
import type { RoleResponse } from '@/types/role'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const roles = ref<RoleResponse[]>([])
const pagination = ref<PaginationMetadata | null>(null)
const pageNumber = ref(1)
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
      pageSize: ROLES_PAGE_SIZE,
    })

    if (
      result.roles.length === 0 &&
      result.pagination.totalPages > 0 &&
      pageNumber.value > result.pagination.totalPages
    ) {
      pageNumber.value = result.pagination.totalPages
      result = await listRoles({
        pageNumber: pageNumber.value,
        pageSize: ROLES_PAGE_SIZE,
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

function askDelete(role: RoleResponse): void {
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
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-slate-600">Browse roles and change the ones your permissions allow.</p>
      <RouterLink
        v-if="canCreate"
        :to="{ name: 'roles-create' }"
        class="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        Create role
      </RouterLink>
    </div>

    <AlertBanner v-if="successMessage" variant="success" :message="successMessage" />

    <div v-if="errorMessage" class="space-y-3">
      <AlertBanner variant="error" :message="errorMessage" />
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        @click="loadRoles"
      >
        Try again
      </button>
    </div>

    <p v-if="loading" class="text-sm text-slate-600" role="status">Loading roles…</p>

    <div
      v-else-if="showEmpty"
      class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm"
    >
      <h2 class="text-lg font-semibold text-slate-900">No roles found</h2>
      <p class="mt-1 text-sm text-slate-600">There are no roles on this page.</p>
    </div>

    <div v-else-if="roles.length > 0" class="space-y-4">
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[480px] text-left text-sm" aria-label="Roles">
            <thead
              class="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase"
            >
              <tr>
                <th scope="col" class="px-4 py-3 font-semibold">Name</th>
                <th v-if="showActions" scope="col" class="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="role in roles" :key="role.id" class="text-slate-800">
                <td class="px-4 py-3 font-medium text-slate-900">{{ role.name }}</td>
                <td v-if="showActions" class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    <RouterLink
                      v-if="canEdit"
                      :to="{ name: 'roles-edit', params: { id: role.id } }"
                      class="rounded-md px-2 py-1 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                      :aria-label="`Edit ${role.name}`"
                    >
                      Edit
                    </RouterLink>
                    <RouterLink
                      v-if="canAssignRights"
                      :to="{ name: 'roles-rights', params: { id: role.id } }"
                      class="rounded-md px-2 py-1 text-sm font-semibold text-sky-700 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                      :aria-label="`Manage rights for ${role.name}`"
                    >
                      Rights
                    </RouterLink>
                    <button
                      v-if="canDelete"
                      type="button"
                      class="rounded-md px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
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
        :pagination="pagination"
        :disabled="loading"
        item-label="roles"
        @change="onPageChange"
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
