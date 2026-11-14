import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'

import { APP_TITLE, formatDocumentTitle } from '@/router/documentTitle'
import { routes } from '@/router/routes'

describe('document titles', () => {
  it('uses the page name and a single application suffix', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
    router.afterEach((to) => {
      document.title = formatDocumentTitle(to)
    })

    const expected: Record<string, string> = {
      home: `Dashboard · ${APP_TITLE}`,
      users: `Users · ${APP_TITLE}`,
      roles: `Roles · ${APP_TITLE}`,
      rights: `Rights Management · ${APP_TITLE}`,
      account: `My Account · ${APP_TITLE}`,
      login: `Sign in · ${APP_TITLE}`,
    }

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
})
