<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { TABLE_SCROLL_CLASS } from '@/constants/pagination'
import type { UserResponse } from '@/types/user'

const props = defineProps<{
  users: UserResponse[]
  canEdit: boolean
  canDelete: boolean
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
</script>

<template>
  <div :class="TABLE_SCROLL_CLASS">
    <table class="min-w-[720px] w-full text-left text-sm" aria-label="Users">
      <thead
        class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase"
      >
        <tr>
          <th scope="col" class="px-4 py-3 font-semibold">Name</th>
          <th scope="col" class="px-4 py-3 font-semibold">Username</th>
          <th scope="col" class="px-4 py-3 font-semibold">Email</th>
          <th scope="col" class="px-4 py-3 font-semibold">Role</th>
          <th scope="col" class="px-4 py-3 font-semibold">Phone</th>
          <th v-if="showActions" scope="col" class="px-4 py-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="user in users" :key="user.id" class="text-slate-800">
          <td class="px-4 py-3 font-medium text-slate-900">{{ displayName(user) }}</td>
          <td class="px-4 py-3">{{ user.userName }}</td>
          <td class="px-4 py-3">{{ user.email }}</td>
          <td class="px-4 py-3">{{ roleLabel(user) }}</td>
          <td class="px-4 py-3">{{ phoneLabel(user) }}</td>
          <td v-if="showActions" class="px-4 py-3">
            <div class="flex flex-wrap gap-2">
              <RouterLink
                v-if="canEdit"
                :to="{ name: 'users-edit', params: { id: user.id } }"
                class="rounded-md px-2 py-1 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                :aria-label="`Edit ${user.userName}`"
              >
                Edit
              </RouterLink>
              <button
                v-if="canDelete"
                type="button"
                class="rounded-md px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                :aria-label="`Delete ${user.userName}`"
                @click="emit('delete', user)"
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
