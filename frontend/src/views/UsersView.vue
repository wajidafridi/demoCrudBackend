<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import UserTable from '@/features/users/components/UserTable.vue'
import { toApiClientError } from '@/services/apiError'
import { deleteUser, listUsers, USERS_PAGE_SIZE } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'
import type { PaginationMetadata } from '@/types/api'
import type { UserResponse } from '@/types/user'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const users = ref<UserResponse[]>([])
const pagination = ref<PaginationMetadata | null>(null)
const pageNumber = ref(1)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const deleteTarget = ref<UserResponse | null>(null)
const deleting = ref(false)

const canCreate = computed(() => authStore.hasPermission('User_Create'))
const canEdit = computed(() => authStore.hasPermission('User_Edit'))
const canDelete = computed(() => authStore.hasPermission('User_Delete'))

const showEmpty = computed(
  () => !loading.value && errorMessage.value == null && users.value.length === 0,
)

const deleteDialogMessage = computed(() => {
  const user = deleteTarget.value
  if (user == null) {
    return ''
  }

  const name = user.fullName.trim()
  const who = name.length > 0 ? `${user.userName} (${name})` : user.userName
  return `This will permanently delete ${who}. This cannot be undone.`
})

async function loadUsers(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    let result = await listUsers({
      pageNumber: pageNumber.value,
      pageSize: USERS_PAGE_SIZE,
    })

    if (
      result.users.length === 0 &&
      result.pagination.totalPages > 0 &&
      pageNumber.value > result.pagination.totalPages
    ) {
      pageNumber.value = result.pagination.totalPages
      result = await listUsers({
        pageNumber: pageNumber.value,
        pageSize: USERS_PAGE_SIZE,
      })
    }

    users.value = result.users
    pagination.value = result.pagination
  } catch (error: unknown) {
    users.value = []
    pagination.value = null
    errorMessage.value = toApiClientError(error, 'Could not load users.').message
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
    successMessage.value = 'User created successfully.'
    await router.replace({ name: 'users' })
  } else if (notice === 'updated') {
    successMessage.value = 'User updated successfully.'
    await router.replace({ name: 'users' })
  }

  await loadUsers()
})

async function onPageChange(nextPage: number): Promise<void> {
  if (loading.value || pagination.value == null || nextPage === pageNumber.value) {
    return
  }

  pageNumber.value = nextPage
  await loadUsers()
}

function askDelete(user: UserResponse): void {
  successMessage.value = null
  errorMessage.value = null
  deleteTarget.value = user
}

function cancelDelete(): void {
  if (deleting.value) {
    return
  }

  deleteTarget.value = null
}

async function confirmDelete(): Promise<void> {
  const user = deleteTarget.value
  if (user == null || deleting.value) {
    return
  }

  deleting.value = true
  errorMessage.value = null

  try {
    const message = await deleteUser(user.id)
    successMessage.value = message || 'User deleted successfully.'
    deleteTarget.value = null
    await loadUsers()
  } catch (error: unknown) {
    deleteTarget.value = null
    errorMessage.value = toApiClientError(error, 'Could not delete the user.').message
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-slate-600">
        Browse accounts and manage the users your role allows you to change.
      </p>
      <RouterLink
        v-if="canCreate"
        :to="{ name: 'users-create' }"
        class="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        Create user
      </RouterLink>
    </div>

    <AlertBanner v-if="successMessage" variant="success" :message="successMessage" />

    <div v-if="errorMessage" class="space-y-3">
      <AlertBanner variant="error" :message="errorMessage" />
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        @click="loadUsers"
      >
        Try again
      </button>
    </div>

    <p v-if="loading" class="text-sm text-slate-600" role="status">Loading users…</p>

    <div
      v-else-if="showEmpty"
      class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm"
    >
      <h2 class="text-lg font-semibold text-slate-900">No users found</h2>
      <p class="mt-1 text-sm text-slate-600">There are no users on this page.</p>
    </div>

    <div v-else-if="users.length > 0" class="space-y-4">
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <UserTable :users="users" :can-edit="canEdit" :can-delete="canDelete" @delete="askDelete" />
      </div>
      <PaginationControls
        v-if="pagination && pagination.totalCount > 0"
        :pagination="pagination"
        :disabled="loading"
        @change="onPageChange"
      />
    </div>

    <ConfirmDialog
      :open="deleteTarget != null"
      title="Delete this user?"
      :message="deleteDialogMessage"
      confirm-label="Delete user"
      :busy="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </section>
</template>
