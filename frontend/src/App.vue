<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import { consumeExplicitLogout, useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated, wasAuthenticated) => {
    if (isAuthenticated || wasAuthenticated !== true) {
      return
    }

    if (consumeExplicitLogout() || router.currentRoute.value.name === 'login') {
      return
    }

    void router.replace({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath },
    })
  },
)
</script>

<template>
  <RouterView />
</template>
