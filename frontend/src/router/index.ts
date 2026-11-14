import { createRouter, createWebHistory } from 'vue-router'

import { formatDocumentTitle } from '@/router/documentTitle'
import { setupAuthGuard } from '@/router/guards'
import { routes } from '@/router/routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

setupAuthGuard(router)

router.afterEach((to) => {
  document.title = formatDocumentTitle(to)
})

export default router
