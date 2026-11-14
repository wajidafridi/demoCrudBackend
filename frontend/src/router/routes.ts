import type { RouteRecordRaw } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'
import AccessDeniedView from '@/views/AccessDeniedView.vue'
import AccountView from '@/views/AccountView.vue'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import RoleFormView from '@/views/RoleFormView.vue'
import RightsView from '@/views/RightsView.vue'
import RolesView from '@/views/RolesView.vue'
import UserFormView from '@/views/UserFormView.vue'
import UsersView from '@/views/UsersView.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      title: 'Sign in',
    },
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
          nav: 'home',
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
        component: UsersView,
        meta: {
          title: 'Users',
          nav: 'users',
          requiresAuth: true,
          permissions: ['User_View'],
        },
      },
      {
        path: 'users/create',
        name: 'users-create',
        component: UserFormView,
        meta: {
          title: 'Create User',
          nav: 'users',
          requiresAuth: true,
          permissions: ['User_Create'],
        },
      },
      {
        path: 'users/:id/edit',
        name: 'users-edit',
        component: UserFormView,
        meta: {
          title: 'Edit User',
          nav: 'users',
          requiresAuth: true,
          permissions: ['User_Edit'],
        },
      },
      {
        path: 'roles',
        name: 'roles',
        component: RolesView,
        meta: {
          title: 'Roles',
          nav: 'roles',
          requiresAuth: true,
          permissions: ['Role_View'],
        },
      },
      {
        path: 'roles/create',
        name: 'roles-create',
        component: RoleFormView,
        meta: {
          title: 'Create Role',
          nav: 'roles',
          requiresAuth: true,
          permissions: ['Role_Create'],
        },
      },
      {
        path: 'roles/:id/edit',
        name: 'roles-edit',
        component: RoleFormView,
        meta: {
          title: 'Edit Role',
          nav: 'roles',
          requiresAuth: true,
          permissions: ['Role_Edit'],
        },
      },
      {
        path: 'account',
        name: 'account',
        component: AccountView,
        meta: {
          title: 'My Account',
          nav: 'account',
          requiresAuth: true,
        },
      },
      {
        path: 'rights',
        name: 'rights',
        component: RightsView,
        meta: {
          title: 'Rights Management',
          nav: 'rights',
          requiresAuth: true,
          permissions: ['Role_View', 'Right_View'],
        },
      },
      {
        path: 'roles/:id/rights',
        name: 'roles-rights',
        redirect: (to) => ({
          name: 'rights',
          query: { roleId: String(to.params.id) },
        }),
        meta: {
          requiresAuth: true,
          permissions: ['Role_View', 'Right_View'],
        },
      },
    ],
  },
]
