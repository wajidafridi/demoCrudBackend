<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import AlertBanner from '@/components/AlertBanner.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import UserTable from '@/features/users/components/UserTable.vue'
import { getAccount } from '@/services/accountService'
import { toApiClientError } from '@/services/apiError'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { deleteUser, listUsers } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'
import type { PaginationMetadata } from '@/types/api'
import type { UserResponse } from '@/types/user'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const users = ref<UserResponse[]>([])
const pagination = ref<PaginationMetadata | null>(null)
const pageNumber = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const deleteTarget = ref<UserResponse | null>(null)
const deleting = ref(false)
const accountId = ref<number | null>(null)

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
      pageSize: pageSize.value,
    })

    if (
      result.users.length === 0 &&
      result.pagination.totalPages > 0 &&
      pageNumber.value > result.pagination.totalPages
    ) {
      pageNumber.value = result.pagination.totalPages
      result = await listUsers({
        pageNumber: pageNumber.value,
        pageSize: pageSize.value,
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

  await Promise.all([loadUsers(), loadAccount()])
})

async function onPageChange(nextPage: number): Promise<void> {
  if (loading.value || pagination.value == null || nextPage === pageNumber.value) {
    return
  }

  pageNumber.value = nextPage
  await loadUsers()
}

async function onPageSizeChange(nextSize: number): Promise<void> {
  if (loading.value || nextSize === pageSize.value) {
    return
  }

  pageSize.value = nextSize
  pageNumber.value = 1
  await loadUsers()
}

function canManage(user: UserResponse): boolean {
  return accountId.value != null && !user.isSystem && user.id !== accountId.value
}

async function loadAccount(): Promise<void> {
  accountId.value = null
  try {
    const profile = await getAccount()
    accountId.value = profile.id
  } catch {
    accountId.value = null
  }
}

function askDelete(user: UserResponse): void {
  if (!canDelete.value || !canManage(user)) {
    return
  }

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
  if (user == null || deleting.value || !canDelete.value || !canManage(user)) {
    deleteTarget.value = null
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
  <section class="mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-col gap-6">
    <div class="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
        <p class="mt-2 max-w-2xl text-sm text-foreground-secondary">
          Browse accounts and manage the users your role allows you to change. Your own account and
          system accounts stay protected here.
        </p>
      </div>
      <RouterLink
        v-if="canCreate"
        :to="{ name: 'users-create' }"
        class="inline-flex shrink-0 items-center justify-center rounded-lg bg-accent-solid px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-accent-foreground hover:bg-accent-solid-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Create user
      </RouterLink>
    </div>

    <AlertBanner v-if="successMessage" variant="success" :message="successMessage" />

    <div v-if="errorMessage" class="space-y-3">
      <AlertBanner variant="error" :message="errorMessage" />
      <button
        type="button"
        class="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-label="Try again"
        @click="loadUsers"
      >
        Try again
      </button>
    </div>

    <p v-if="loading" class="text-sm text-foreground-secondary" role="status">Loading users…</p>

    <div
      v-else-if="showEmpty"
      class="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center"
    >
      <h2 class="text-lg font-semibold text-foreground">No users found</h2>
      <p class="mt-1 text-sm text-foreground-secondary">There are no users on this page.</p>
    </div>

    <div v-else-if="users.length > 0" class="flex min-h-0 min-w-0 flex-col gap-4">
      <div class="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
        <UserTable
          :users="users"
          :can-edit="canEdit"
          :can-delete="canDelete"
          :account-id="accountId"
          @delete="askDelete"
        />
      </div>
      <PaginationControls
        v-if="pagination && pagination.totalCount > 0"
        class="shrink-0"
        :pagination="pagination"
        :page-size="pageSize"
        :disabled="loading"
        @change="onPageChange"
        @update:page-size="onPageSizeChange"
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
