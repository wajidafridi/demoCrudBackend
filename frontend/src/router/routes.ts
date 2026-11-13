import type { RouteRecordRaw } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'
import AccessDeniedView from '@/views/AccessDeniedView.vue'
import AccountView from '@/views/AccountView.vue'
import DashboardView from '@/views/DashboardView.vue'
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
        component: DashboardView,
        meta: {
          title: 'Dashboard',
          requiresAuth: true,
        },
      },
      {
        path: 'access-denied',
        name: 'access-denied',
        component: AccessDeniedView,
        meta: {
          title: 'Access Denied',
        },
      },
      {
        path: 'users',
        name: 'users',
        component: PlaceholderView,
        meta: {
          title: 'Users',
          requiresAuth: true,
          permissions: ['User_View'],
        },
      },
      {
        path: 'users/create',
        name: 'users-create',
        component: PlaceholderView,
        meta: {
          title: 'Create User',
          requiresAuth: true,
          permissions: ['User_Create'],
        },
      },
      {
        path: 'users/:id/edit',
        name: 'users-edit',
        component: PlaceholderView,
        meta: {
          title: 'Edit User',
          requiresAuth: true,
          permissions: ['User_Edit'],
        },
      },
      {
        path: 'roles',
        name: 'roles',
        component: PlaceholderView,
        meta: {
          title: 'Roles',
          requiresAuth: true,
          permissions: ['Role_View'],
        },
      },
      {
        path: 'roles/create',
        name: 'roles-create',
        component: PlaceholderView,
        meta: {
          title: 'Create Role',
          requiresAuth: true,
          permissions: ['Role_Create'],
        },
      },
      {
        path: 'account',
        name: 'account',
        component: AccountView,
        meta: {
          title: 'My Account',
          requiresAuth: true,
        },
      },
      {
        path: 'roles/:id/rights',
        name: 'roles-rights',
        component: PlaceholderView,
        meta: {
          title: 'Role Rights',
          requiresAuth: true,
          permissions: ['Role_View', 'RoleRight_Assign'],
        },
      },
    ],
  },
]
