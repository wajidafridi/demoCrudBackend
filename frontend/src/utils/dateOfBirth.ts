/**
 * Date of birth is a calendar date (`YYYY-MM-DD`), not a timestamp.
 * "Today" is the current UTC calendar date. The browser and the API both
 * reject a date after that UTC date, so a local midnight does not change the result.
 */
export function formatUtcDate(value: Date): string {
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${value.getUTCFullYear()}-${month}-${day}`
}

export function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/** Empty is allowed. A real calendar date after the UTC date of `today` is rejected. */
export function dateOfBirthError(value: string, today = new Date()): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (!isValidDateInput(trimmed)) {
    return 'Enter a valid date of birth.'
  }

  if (trimmed > formatUtcDate(today)) {
    return 'Date of birth cannot be in the future.'
  }

  return null
}
