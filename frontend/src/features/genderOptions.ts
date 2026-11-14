/** Stored gender values. Empty remains allowed. */
export const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const

export function genderChoiceError(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (!(GENDER_OPTIONS as readonly string[]).includes(trimmed)) {
    return 'Select Male, Female, or Other.'
  }

  return null
}
