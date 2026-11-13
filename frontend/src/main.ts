import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
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

app.use(router)
app.mount('#app')
