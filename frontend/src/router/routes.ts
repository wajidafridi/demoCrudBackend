import type { RouteRecordRaw } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'
import AccessDeniedView from '@/views/AccessDeniedView.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: HomeView,
      },
      {
        path: 'access-denied',
        name: 'access-denied',
        component: AccessDeniedView,
      },
      {
        path: 'users',
        name: 'users',
        component: PlaceholderView,
        meta: {
          requiresAuth: true,
          permissions: ['User_View'],
        },
      },
      {
        path: 'users/create',
        name: 'users-create',
        component: PlaceholderView,
        meta: {
          requiresAuth: true,
          permissions: ['User_Create'],
        },
      },
      {
        path: 'users/:id/edit',
        name: 'users-edit',
        component: PlaceholderView,
        meta: {
          requiresAuth: true,
          permissions: ['User_Edit'],
        },
      },
      {
        path: 'roles',
        name: 'roles',
        component: PlaceholderView,
        meta: {
          requiresAuth: true,
          permissions: ['Role_View'],
        },
      },
      {
        path: 'roles/create',
        name: 'roles-create',
        component: PlaceholderView,
        meta: {
          requiresAuth: true,
          permissions: ['Role_Create'],
        },
      },
      {
        // Example: auth-only route with no permission metadata.
        path: 'account',
        name: 'account',
        component: PlaceholderView,
        meta: {
          requiresAuth: true,
        },
      },
      {
        // Example: multiple permissions must all be present.
        path: 'roles/:id/rights',
        name: 'roles-rights',
        component: PlaceholderView,
        meta: {
          requiresAuth: true,
          permissions: ['Role_View', 'RoleRight_Assign'],
        },
      },
    ],
  },
]
