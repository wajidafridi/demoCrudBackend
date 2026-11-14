import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setupAccessWatcher } from '@/router/guards'
import { registerAccessSyncHandler } from '@/services/accessSync'
import { registerUnauthorizedSessionHandler } from '@/services/unauthorizedHandler'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/theme/useTheme'

import './style.css'

useTheme()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const authStore = useAuthStore(pinia)
registerUnauthorizedSessionHandler(() => {
  authStore.clearSession()
})

// Keeps displayed rights in step with the backend, which re-checks them on every request.
registerAccessSyncHandler({
  onVersion: (version) => authStore.handleAccessVersion(version),
  onForbidden: () => {
    void authStore.refreshAccess()
  },
})
authStore.startAccessMonitor()

app.use(router)
setupAccessWatcher(router)
app.mount('#app')
