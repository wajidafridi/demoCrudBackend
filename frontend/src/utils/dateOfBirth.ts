/** Calendar date `YYYY-MM-DD` in the user's local timezone. */
export function formatLocalDate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
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

/** Empty is allowed. A real calendar date after today is rejected. */
export function dateOfBirthError(value: string, today = new Date()): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (!isValidDateInput(trimmed)) {
    return 'Enter a valid date of birth.'
  }

  if (trimmed > formatLocalDate(today)) {
    return 'Date of birth cannot be in the future.'
  }

  return null
}
