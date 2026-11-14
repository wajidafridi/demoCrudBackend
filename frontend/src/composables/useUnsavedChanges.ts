import { onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export const UNSAVED_CHANGES_MESSAGE = 'You have unsaved changes. Leave without saving?'

/**
 * Warns on in-app navigation and on refresh or tab close.
 * Call `allowNextLeave` after a successful save so the following redirect is quiet.
 */
export function useUnsavedChanges(isDirty: () => boolean): { allowNextLeave: () => void } {
  let skip = false

  function allowNextLeave(): void {
    skip = true
  }

  onBeforeRouteLeave(() => {
    if (skip || !isDirty()) {
      return true
    }

    return window.confirm(UNSAVED_CHANGES_MESSAGE)
  })

  function onBeforeUnload(event: BeforeUnloadEvent): void {
    if (skip || !isDirty()) {
      return
    }

    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
  })

  return { allowNextLeave }
}
