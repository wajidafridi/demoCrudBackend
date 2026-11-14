import { describe, expect, it } from 'vitest'

import { dateOfBirthError, formatUtcDate } from '@/utils/dateOfBirth'

describe('date of birth calendar dates', () => {
  const lateUtc = new Date(Date.UTC(2026, 10, 14, 23, 30, 0))
  const afterUtcMidnight = new Date(Date.UTC(2026, 10, 15, 0, 5, 0))

  it('uses the UTC calendar date around midnight', () => {
    expect(formatUtcDate(lateUtc)).toBe('2026-11-14')
    expect(formatUtcDate(afterUtcMidnight)).toBe('2026-11-15')
  })

  it('accepts yesterday and today, and rejects tomorrow, on the UTC date', () => {
    expect(dateOfBirthError('2026-11-13', lateUtc)).toBeNull()
    expect(dateOfBirthError('2026-11-14', lateUtc)).toBeNull()
    expect(dateOfBirthError('2026-11-15', lateUtc)).toBe('Date of birth cannot be in the future.')

    expect(dateOfBirthError('2026-11-14', afterUtcMidnight)).toBeNull()
    expect(dateOfBirthError('2026-11-15', afterUtcMidnight)).toBeNull()
    expect(dateOfBirthError('2026-11-16', afterUtcMidnight)).toBe(
      'Date of birth cannot be in the future.',
    )
  })

  it('does not treat a later local calendar date as today', () => {
    expect(dateOfBirthError('2026-11-15', lateUtc)).toBe('Date of birth cannot be in the future.')
  })
})
