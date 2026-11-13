<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { TABLE_SCROLL_CLASS } from '@/constants/pagination'
import type { UserResponse } from '@/types/user'

const props = defineProps<{
  users: UserResponse[]
  canEdit: boolean
  canDelete: boolean
  /** Signed-in account id from `GET /api/account`. Null until that call succeeds. */
  accountId: number | null
}>()

const emit = defineEmits<{
  delete: [user: UserResponse]
}>()

const showActions = computed(() => props.canEdit || props.canDelete)

function displayName(user: UserResponse): string {
  const name = user.fullName.trim()
  return name.length > 0 ? name : user.userName
}

function roleLabel(user: UserResponse): string {
  if (user.roleName != null && user.roleName.trim().length > 0) {
    return user.roleName
  }

  return `Role ${user.roleId}`
}

function phoneLabel(user: UserResponse): string {
  if (user.phoneNumber != null && user.phoneNumber.trim().length > 0) {
    return user.phoneNumber
  }

  return '—'
}

/** Own and system accounts stay read-only. Unknown account identity hides actions. */
function canManage(user: UserResponse): boolean {
  if (props.accountId == null || user.isSystem || user.id === props.accountId) {
    return false
  }

  return true
}
</script>

<template>
  <div :class="[TABLE_SCROLL_CLASS, 'w-full max-w-full']">
    <table class="w-full min-w-[720px] text-left text-sm" aria-label="Users">
      <thead
        class="sticky top-0 z-10 border-b border-border bg-surface-secondary text-xs tracking-wide text-foreground-muted uppercase"
      >
        <tr>
          <th scope="col" class="px-3 py-3 font-semibold">Name</th>
          <th scope="col" class="px-3 py-3 font-semibold">Username</th>
          <th scope="col" class="px-3 py-3 font-semibold">Email</th>
          <th scope="col" class="px-3 py-3 font-semibold">Role</th>
          <th scope="col" class="px-3 py-3 font-semibold">Status</th>
          <th scope="col" class="px-3 py-3 font-semibold">Phone</th>
          <th v-if="showActions" scope="col" class="px-3 py-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border-subtle">
        <tr v-for="user in users" :key="user.id" class="text-foreground hover:bg-surface-secondary">
          <td class="px-3 py-3.5 font-medium break-words">{{ displayName(user) }}</td>
          <td class="px-3 py-3.5 whitespace-nowrap text-foreground-secondary">
            {{ user.userName }}
          </td>
          <td class="px-3 py-3.5 break-words">{{ user.email }}</td>
          <td class="px-3 py-3.5">
            <span
              class="inline-flex max-w-full rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium break-words text-foreground-secondary"
            >
              {{ roleLabel(user) }}
            </span>
          </td>
          <td class="px-3 py-3.5">
            <span
              class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
              :class="
                user.isSystem
                  ? 'bg-surface-secondary text-warning'
                  : 'bg-surface-secondary text-foreground-secondary'
              "
            >
              {{ user.isSystem ? 'System' : 'Standard' }}
            </span>
          </td>
          <td class="px-3 py-3.5 whitespace-nowrap text-foreground-secondary">
            {{ phoneLabel(user) }}
          </td>
          <td v-if="showActions" class="px-3 py-3.5">
            <div v-if="canManage(user)" class="flex flex-wrap gap-2">
              <RouterLink
                v-if="canEdit"
                :to="{ name: 'users-edit', params: { id: user.id } }"
                class="rounded-md border border-border px-2.5 py-1 text-sm font-semibold text-foreground hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                :aria-label="`Edit ${user.userName}`"
              >
                Edit
              </RouterLink>
              <button
                v-if="canDelete"
                type="button"
                class="rounded-md border border-border px-2.5 py-1 text-sm font-semibold text-danger hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                :aria-label="`Delete ${user.userName}`"
                @click="emit('delete', user)"
              >
                Delete
              </button>
            </div>
            <span v-else class="text-sm text-foreground-muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
