import type { AccountProfile, UpdateAccountRequest } from '@/types/account'
import { genderChoiceError } from '@/features/genderOptions'
import { dateOfBirthError } from '@/utils/dateOfBirth'

export type AccountField =
  'firstName' | 'lastName' | 'email' | 'phoneNumber' | 'gender' | 'dateOfBirth' | 'address'

export type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword'

export interface AccountFormValues {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  gender: string
  dateOfBirth: string
  address: string
}

export interface PasswordFormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const LIMITS = {
  name: 100,
  email: 256,
  phone: 50,
  address: 500,
  passwordMin: 8,
  passwordMax: 100,
} as const

export function emptyAccountForm(): AccountFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: '',
    address: '',
  }
}

export function emptyPasswordForm(): PasswordFormValues {
  return {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
}

function toDateInputValue(value: string | null): string {
  if (value == null || value.length < 10) {
    return ''
  }

  const datePart = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : ''
}

export function profileToForm(profile: AccountProfile): AccountFormValues {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phoneNumber: profile.phoneNumber ?? '',
    gender: profile.gender ?? '',
    dateOfBirth: toDateInputValue(profile.dateOfBirth),
    address: profile.address ?? '',
  }
}

function requiredText(value: string, label: string, max: number): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return `${label} is required.`
  }

  if (trimmed.length > max) {
    return `${label} must be at most ${max} characters.`
  }

  return null
}

function optionalText(value: string, label: string, max: number): string | null {
  if (value.trim().length > max) {
    return `${label} must be at most ${max} characters.`
  }

  return null
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validateAccountForm(
  values: AccountFormValues,
): Partial<Record<AccountField, string>> {
  const errors: Partial<Record<AccountField, string>> = {}

  const firstNameError = requiredText(values.firstName, 'First name', LIMITS.name)
  if (firstNameError != null) {
    errors.firstName = firstNameError
  }

  const lastNameError = requiredText(values.lastName, 'Last name', LIMITS.name)
  if (lastNameError != null) {
    errors.lastName = lastNameError
  }

  const emailError = requiredText(values.email, 'Email', LIMITS.email)
  if (emailError != null) {
    errors.email = emailError
  } else if (!isValidEmail(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  const phoneError = optionalText(values.phoneNumber, 'Phone number', LIMITS.phone)
  if (phoneError != null) {
    errors.phoneNumber = phoneError
  }

  const genderError = genderChoiceError(values.gender)
  if (genderError != null) {
    errors.gender = genderError
  }

  const birthError = dateOfBirthError(values.dateOfBirth)
  if (birthError != null) {
    errors.dateOfBirth = birthError
  }

  const addressError = optionalText(values.address, 'Address', LIMITS.address)
  if (addressError != null) {
    errors.address = addressError
  }

  return errors
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

/** Profile update body. Username, role, system flag, and password are omitted. */
export function toUpdateAccountRequest(
  values: AccountFormValues,
  imageUrl: string | null,
): UpdateAccountRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    phoneNumber: blankToNull(values.phoneNumber),
    gender: blankToNull(values.gender),
    dateOfBirth: blankToNull(values.dateOfBirth),
    address: blankToNull(values.address),
    imageUrl,
  }
}

export function validatePasswordForm(
  values: PasswordFormValues,
): Partial<Record<PasswordField, string>> {
  const errors: Partial<Record<PasswordField, string>> = {}

  if (values.currentPassword.length === 0) {
    errors.currentPassword = 'Current password is required.'
  } else if (values.currentPassword.length > LIMITS.passwordMax) {
    errors.currentPassword = `Current password must be at most ${LIMITS.passwordMax} characters.`
  }

  if (values.newPassword.length === 0) {
    errors.newPassword = 'New password is required.'
  } else if (values.newPassword.length < LIMITS.passwordMin) {
    errors.newPassword = `New password must be at least ${LIMITS.passwordMin} characters.`
  } else if (values.newPassword.length > LIMITS.passwordMax) {
    errors.newPassword = `New password must be at most ${LIMITS.passwordMax} characters.`
  } else if (values.currentPassword.length > 0 && values.newPassword === values.currentPassword) {
    errors.newPassword = 'New password must be different from the current password.'
  }

  if (values.confirmPassword.length === 0) {
    errors.confirmPassword = 'Confirm password is required.'
  } else if (values.newPassword.length > 0 && values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Confirm password must match the new password.'
  }

  return errors
}

function normalizeFieldKey(key: string): string {
  const segment = key.split('.').pop() ?? key
  const withoutDollar = segment.startsWith('$') ? segment.slice(1) : segment
  return withoutDollar.toLowerCase()
}

export function readFieldError(
  errors: Record<string, string[]> | null,
  field: string,
): string | null {
  if (errors == null) {
    return null
  }

  const target = field.toLowerCase()
  const messages: string[] = []
  for (const [key, value] of Object.entries(errors)) {
    if (normalizeFieldKey(key) === target) {
      messages.push(...value)
    }
  }

  return messages.length > 0 ? messages.join(' ') : null
}
