import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import UserTable from '@/features/users/components/UserTable.vue'
import type { UserResponse } from '@/types/user'

function makeUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: 7,
    isSystem: false,
    firstName: 'Ada',
    lastName: 'Lovelace',
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    userName: 'ada',
    roleId: 3,
    roleName: 'User',
    address: null,
    phoneNumber: null,
    gender: null,
    dateOfBirth: null,
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    age: null,
    ...overrides,
  }
}

describe('UserTable long values', () => {
  it('caps name, username and email so one long value cannot push Actions off-screen', () => {
    const longName = 'W'.repeat(100)
    const longUserName = `qa_long_${'x'.repeat(92)}`
    const longEmail = `${'e'.repeat(240)}@example.com`
    const wrapper = mount(UserTable, {
      props: {
        users: [makeUser({ fullName: longName, userName: longUserName, email: longEmail })],
        canEdit: true,
        canDelete: true,
        accountId: 1,
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const cells = wrapper.findAll('tbody td')
    for (const [index, value] of [longName, longUserName, longEmail].entries()) {
      const capped = cells[index]?.get('span')
      expect(capped?.text()).toBe(value)
      expect(capped?.classes()).toEqual(
        expect.arrayContaining(['block', 'max-w-64', 'wrap-break-word']),
      )
    }

    expect(wrapper.get('[aria-label^="Edit qa_long_"]').exists()).toBe(true)
    expect(wrapper.get('[aria-label^="Delete qa_long_"]').exists()).toBe(true)
  })
})
