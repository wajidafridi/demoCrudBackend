import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'

import { routes } from '@/router/routes'
import NotFoundView from '@/views/NotFoundView.vue'

describe('NotFoundView', () => {
  it('explains the missing page and links to the dashboard', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    await router.push('/no-such-page')
    await router.isReady()

    const wrapper = mount(NotFoundView, {
      global: { plugins: [router] },
    })

    expect(router.currentRoute.value.name).toBe('not-found')
    expect(wrapper.get('h1').text()).toBe('Page not found')
    expect(wrapper.text()).toContain('That address does not match a page')
    expect(wrapper.get('a').attributes('href')).toBe('/')
    expect(wrapper.get('a').classes()).toContain('focus-visible:outline-focus')

    await wrapper.get('a').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('home')
  })
})
