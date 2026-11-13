import type { CreateUserRequest, UpdateUserRequest, UserResponse } from '@/types/user'

export type UserFormField =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'userName'
  | 'password'
  | 'roleId'
  | 'address'
  | 'phoneNumber'
  | 'gender'
  | 'dateOfBirth'
  | 'imageUrl'

export type UserFormMode = 'create' | 'edit'

export interface UserFormValues {
  firstName: string
  lastName: string
  email: string
  userName: string
  password: string
  roleId: string
  address: string
  phoneNumber: string
  gender: string
  dateOfBirth: string
  imageUrl: string
}

export type UserFormSubmission =
  { mode: 'create'; body: CreateUserRequest } | { mode: 'edit'; body: UpdateUserRequest }

const FIELD_NAMES = new Set<string>([
  'firstname',
  'lastname',
  'email',
  'username',
  'password',
  'roleid',
  'address',
  'phonenumber',
  'gender',
  'dateofbirth',
  'imageurl',
])

const LIMITS = {
  name: 100,
  email: 256,
  passwordMin: 6,
  passwordMax: 100,
  address: 500,
  phone: 50,
  gender: 50,
  imageUrl: 500,
} as const

export function emptyUserForm(): UserFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    userName: '',
    password: '',
    roleId: '',
    address: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: '',
    imageUrl: '',
  }
}

function toDateInputValue(value: string | null): string {
  if (value == null || value.length < 10) {
    return ''
  }

  const datePart = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : ''
}

export function userToFormValues(user: UserResponse): UserFormValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userName: user.userName,
    password: '',
    roleId: String(user.roleId),
    address: user.address ?? '',
    phoneNumber: user.phoneNumber ?? '',
    gender: user.gender ?? '',
    dateOfBirth: toDateInputValue(user.dateOfBirth),
    imageUrl: user.imageUrl ?? '',
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

function isValidDateInput(value: string): boolean {
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

function parseRoleId(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null
  }

  return parsed
}

export function validateUserForm(
  values: UserFormValues,
  mode: UserFormMode,
): Partial<Record<UserFormField, string>> {
  const errors: Partial<Record<UserFormField, string>> = {}

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

  const userNameError = requiredText(values.userName, 'Username', LIMITS.name)
  if (userNameError != null) {
    errors.userName = userNameError
  }

  if (mode === 'create') {
    const password = values.password
    if (password.length === 0) {
      errors.password = 'Password is required.'
    } else if (password.length < LIMITS.passwordMin) {
      errors.password = `Password must be at least ${LIMITS.passwordMin} characters.`
    } else if (password.length > LIMITS.passwordMax) {
      errors.password = `Password must be at most ${LIMITS.passwordMax} characters.`
    }
  }

  if (values.roleId.trim().length === 0) {
    errors.roleId = 'Role is required.'
  } else if (parseRoleId(values.roleId) == null) {
    errors.roleId = 'Role is required.'
  }

  const addressError = optionalText(values.address, 'Address', LIMITS.address)
  if (addressError != null) {
    errors.address = addressError
  }

  const phoneError = optionalText(values.phoneNumber, 'Phone number', LIMITS.phone)
  if (phoneError != null) {
    errors.phoneNumber = phoneError
  }

  const genderError = optionalText(values.gender, 'Gender', LIMITS.gender)
  if (genderError != null) {
    errors.gender = genderError
  }

  const dateOfBirth = values.dateOfBirth.trim()
  if (dateOfBirth.length > 0 && !isValidDateInput(dateOfBirth)) {
    errors.dateOfBirth = 'Enter a valid date of birth.'
  }

  const imageError = optionalText(values.imageUrl, 'Image URL', LIMITS.imageUrl)
  if (imageError != null) {
    errors.imageUrl = imageError
  }

  return errors
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function toSharedFields(values: UserFormValues): Omit<CreateUserRequest, 'password'> {
  const roleId = parseRoleId(values.roleId)
  if (roleId == null) {
    throw new Error('Role id is invalid.')
  }

  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    userName: values.userName.trim(),
    roleId,
    address: blankToNull(values.address),
    phoneNumber: blankToNull(values.phoneNumber),
    gender: blankToNull(values.gender),
    dateOfBirth: blankToNull(values.dateOfBirth),
    imageUrl: blankToNull(values.imageUrl),
  }
}

export function toCreateRequest(values: UserFormValues): CreateUserRequest {
  return {
    ...toSharedFields(values),
    password: values.password,
  }
}

export function toUpdateRequest(values: UserFormValues): UpdateUserRequest {
  return toSharedFields(values)
}

export function toUserFormSubmission(
  values: UserFormValues,
  mode: UserFormMode,
): UserFormSubmission {
  if (mode === 'create') {
    return { mode: 'create', body: toCreateRequest(values) }
  }

  return { mode: 'edit', body: toUpdateRequest(values) }
}

function normalizeFieldKey(key: string): string {
  const segment = key.split('.').pop() ?? key
  const withoutDollar = segment.startsWith('$') ? segment.slice(1) : segment
  return withoutDollar.toLowerCase()
}

export function fieldErrorMessage(
  errors: Record<string, string[]> | null,
  field: UserFormField,
): string | null {
  if (errors == null) {
    return null
  }

  const messages: string[] = []
  const target = field.toLowerCase()

  for (const [key, value] of Object.entries(errors)) {
    if (normalizeFieldKey(key) === target) {
      messages.push(...value)
    }
  }

  return messages.length > 0 ? messages.join(' ') : null
}

export function unmatchedFieldMessages(errors: Record<string, string[]> | null): string[] {
  if (errors == null) {
    return []
  }

  const messages: string[] = []
  for (const [key, value] of Object.entries(errors)) {
    if (!FIELD_NAMES.has(normalizeFieldKey(key))) {
      messages.push(...value)
    }
  }

  return messages
}

export function describeUserFormError(
  message: string,
  fieldErrors: Record<string, string[]> | null,
): string {
  const extra = unmatchedFieldMessages(fieldErrors)
  if (extra.length === 0) {
    return message
  }

  return `${message} ${extra.join(' ')}`
}

export function parseUserId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null
  }

  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) {
    return null
  }

  return id
}
