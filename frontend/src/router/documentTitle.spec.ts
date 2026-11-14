import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'

import { APP_TITLE, formatDocumentTitle, setupDocumentTitle } from '@/router/documentTitle'
import { routes } from '@/router/routes'

describe('document titles', () => {
  it('uses the page name and a single application suffix', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    setupDocumentTitle(router)

    const expected: Record<string, string> = {
      home: `Dashboard · ${APP_TITLE}`,
      users: `Users · ${APP_TITLE}`,
      roles: `Roles · ${APP_TITLE}`,
      rights: `Rights Management · ${APP_TITLE}`,
      account: `My Account · ${APP_TITLE}`,
      login: `Sign in · ${APP_TITLE}`,
    }

    await router.push('/no-such-page')
    expect(document.title).toBe(`Page Not Found · ${APP_TITLE}`)

    for (const [name, title] of Object.entries(expected)) {
      await router.push({ name })
      expect(document.title).toBe(title)
      expect(document.title.split(APP_TITLE)).toHaveLength(2)
    }
  })

  it('falls back when a route has no page title and does not duplicate a suffix', () => {
    expect(formatDocumentTitle({ matched: [] })).toBe(APP_TITLE)
    expect(
      formatDocumentTitle({
        matched: [{ meta: { title: `Already named · ${APP_TITLE}` } }] as never,
      }),
    ).toBe(`Already named · ${APP_TITLE}`)
  })

  it('keeps the current title when a guard cancels the navigation', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    setupDocumentTitle(router)
    // Same effect as choosing "stay on this page" in the unsaved-changes prompt.
    router.beforeEach((to) => to.name !== 'users')

    await router.push({ name: 'account' })
    expect(document.title).toBe(`My Account · ${APP_TITLE}`)

    await router.push({ name: 'users' })
    expect(router.currentRoute.value.name).toBe('account')
    expect(document.title).toBe(`My Account · ${APP_TITLE}`)
  })
})
