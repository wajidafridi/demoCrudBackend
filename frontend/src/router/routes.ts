import type { RouteRecordRaw } from 'vue-router'

import AppLayout from '@/layouts/AppLayout.vue'
import AccessDeniedView from '@/views/AccessDeniedView.vue'
import AccountView from '@/views/AccountView.vue'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import RoleFormView from '@/views/RoleFormView.vue'
import RoleRightsView from '@/views/RoleRightsView.vue'
import RolesView from '@/views/RolesView.vue'
import UserFormView from '@/views/UserFormView.vue'
import UsersView from '@/views/UsersView.vue'

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
        component: UsersView,
        meta: {
          title: 'Users',
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
          requiresAuth: true,
        },
      },
      {
        path: 'roles/:id/rights',
        name: 'roles-rights',
        component: RoleRightsView,
        meta: {
          title: 'Role Rights',
          requiresAuth: true,
          permissions: ['Role_View', 'RoleRight_Assign'],
        },
      },
    ],
  },
]
