/** Sidebar section key. Child routes share the key of their list page. */
export type AppNavKey = 'home' | 'users' | 'roles' | 'rights' | 'account'

export interface AppNavItem {
  label: string
  to: { name: string }
  nav: AppNavKey
  /** Shown only when the user has every listed permission. */
  permissions?: readonly string[]
}

/** Primary sidebar links for the authenticated shell. */
export const appNavItems: AppNavItem[] = [
  { label: 'Dashboard', to: { name: 'home' }, nav: 'home' },
  { label: 'Users', to: { name: 'users' }, nav: 'users', permissions: ['User_View'] },
  { label: 'Roles', to: { name: 'roles' }, nav: 'roles', permissions: ['Role_View'] },
  {
    label: 'Rights Management',
    to: { name: 'rights' },
    nav: 'rights',
    permissions: ['Role_View', 'Right_View'],
  },
  { label: 'Account', to: { name: 'account' }, nav: 'account' },
]
