<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import NavIcons from '@/components/icons/NavIcons.vue'
import { appNavItems, type AppNavKey } from '@/navigation/appNav'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

const userName = computed(() => {
  const name = authStore.user?.userName?.trim() ?? ''
  return name.length > 0 ? name : null
})

const roleName = computed(() => {
  const role = authStore.user?.roleName?.trim() ?? ''
  return role.length > 0 ? role : null
})

const actionCopy: Record<Exclude<AppNavKey, 'home'>, string> = {
  users: 'Review accounts and manage the users your role allows you to change.',
  roles: 'Review the roles you can manage. System roles stay off this list.',
  rights: 'Assign or remove rights for a role you are allowed to manage.',
  account: 'Review your profile and update your password.',
}

type ActionIcon = 'users' | 'roles' | 'rights' | 'account'

const actions = computed(() =>
  appNavItems
    .filter((item) => item.nav !== 'home')
    .filter((item) => {
      if (!authStore.isAuthenticated) {
        return false
      }
      if (item.permissions == null) {
        return true
      }
      return item.permissions.every((permission) => authStore.hasPermission(permission))
    })
    .map((item) => ({
      nav: item.nav,
      to: item.to,
      title: item.nav === 'account' ? 'My Account' : item.label,
      description: actionCopy[item.nav as Exclude<AppNavKey, 'home'>],
      icon: item.nav as ActionIcon,
    })),
)

const hasManagementAccess = computed(() =>
  actions.value.some(
    (item) => item.nav === 'users' || item.nav === 'roles' || item.nav === 'rights',
  ),
)
</script>

<template>
  <section class="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8">
    <header class="max-w-2xl">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        <template v-if="userName">Welcome back, {{ userName }}</template>
        <template v-else>Welcome back</template>
      </h1>
      <p class="mt-2 text-sm text-foreground-secondary sm:text-base">
        <template v-if="roleName">
          You are signed in as <span class="font-medium text-foreground">{{ roleName }}</span>.
        </template>
        <template v-else>You are signed in.</template>
        Choose a shortcut below. Each one follows the same permissions as the sidebar.
      </p>
      <p v-if="!hasManagementAccess" class="mt-2 text-sm text-foreground-secondary">
        Your role does not include Users, Roles, or Rights. You can still review your account.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <RouterLink
        v-for="action in actions"
        :key="action.nav"
        :to="action.to"
        class="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-surface p-5 hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-page text-accent">
          <NavIcons :name="action.icon" />
        </div>
        <h2 class="text-lg font-semibold text-foreground">{{ action.title }}</h2>
        <p class="mt-1 flex-1 text-sm text-foreground-secondary">{{ action.description }}</p>
        <span class="mt-4 text-sm font-semibold text-accent">Open</span>
      </RouterLink>
    </div>
  </section>
</template>
