import { describe, expect, it } from 'vitest'

/**
 * Tailwind v4: `outline-none` sets `--tw-outline-style: none`, and the bare `outline` utility reads
 * that variable. An element with both `outline-none` and `focus-visible:outline` therefore shows
 * no focus outline at all. Such elements must use `focus-visible:outline-solid` instead.
 */
const sources = import.meta.glob('/src/**/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const CLASS_ATTRIBUTE = /\bclass="([^"]*)"/g

describe('keyboard focus indicators', () => {
  it('finds the component sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10)
  })

  it('never cancels the focus-visible outline with outline-none', () => {
    const offenders: string[] = []

    for (const [file, source] of Object.entries(sources)) {
      for (const match of source.matchAll(CLASS_ATTRIBUTE)) {
        const classes = (match[1] ?? '').split(/\s+/)
        if (classes.includes('outline-none') && classes.includes('focus-visible:outline')) {
          offenders.push(file)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
