import { createRouter, createWebHistory } from 'vue-router'

import { setupAuthGuard } from '@/router/guards'
import { routes } from '@/router/routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

setupAuthGuard(router)

export default router
