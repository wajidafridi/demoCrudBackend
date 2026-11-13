export interface AppNavItem {
  label: string
  to: { name: string }
  /** When set, the link is shown only if `hasPermission` returns true. */
  permission?: string
}

/** Primary sidebar links for the authenticated shell. */
export const appNavItems: AppNavItem[] = [
  { label: 'Dashboard', to: { name: 'home' } },
  { label: 'Users', to: { name: 'users' }, permission: 'User_View' },
  { label: 'Roles', to: { name: 'roles' }, permission: 'Role_View' },
  { label: 'Account', to: { name: 'account' } },
]
