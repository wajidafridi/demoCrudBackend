<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import NavIcons from '@/components/icons/NavIcons.vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

const userName = computed(() => authStore.user?.userName ?? 'there')
const roleName = computed(() => authStore.user?.roleName ?? null)
const canViewUsers = computed(() => authStore.hasPermission('User_View'))
const canViewRoles = computed(() => authStore.hasPermission('Role_View'))
</script>

<template>
  <div class="space-y-6">
    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center lg:p-8">
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Welcome back, {{ userName }}!
          </h2>
          <p class="max-w-2xl text-slate-600">
            <template v-if="roleName">
              You are signed in as
              <span class="font-medium text-slate-800">{{ roleName }}</span>.
            </template>
            <template v-else>
              You are signed in. Role details will appear after the next login.
            </template>
            Use the shortcuts below to manage the application.
          </p>
        </div>
        <div
          class="hidden h-28 w-40 items-end justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 p-4 md:flex"
          aria-hidden="true"
        >
          <div class="h-16 w-24 rounded-lg border border-white/40 bg-white/20 shadow-lg" />
        </div>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <article
        v-if="canViewUsers"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div
          class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"
        >
          <NavIcons name="users" />
        </div>
        <h3 class="text-lg font-semibold text-slate-900">Users</h3>
        <p class="mt-1 text-sm text-slate-600">Manage system users and their access.</p>
        <RouterLink
          :to="{ name: 'users' }"
          class="mt-4 inline-flex text-sm font-semibold text-violet-700 hover:text-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          Go to Users →
        </RouterLink>
      </article>

      <article
        v-if="canViewRoles"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div
          class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700"
        >
          <NavIcons name="roles" />
        </div>
        <h3 class="text-lg font-semibold text-slate-900">Roles</h3>
        <p class="mt-1 text-sm text-slate-600">Manage roles and the rights assigned to them.</p>
        <RouterLink
          :to="{ name: 'roles' }"
          class="mt-4 inline-flex text-sm font-semibold text-violet-700 hover:text-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          Go to Roles →
        </RouterLink>
      </article>

      <article
        v-if="!canViewUsers && !canViewRoles"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2"
      >
        <h3 class="text-lg font-semibold text-slate-900">Limited access</h3>
        <p class="mt-1 text-sm text-slate-600">
          Your account does not include Users or Roles view permissions yet. You can still open your
          account page from the sidebar.
        </p>
      </article>
    </section>
  </div>
</template>
