import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ConfirmDialog from '@/components/ConfirmDialog.vue'

function dialogProps(open: boolean, busy = false) {
  return {
    open,
    busy,
    title: 'Delete user',
    message: 'This cannot be undone.',
    confirmLabel: 'Delete',
  }
}

describe('ConfirmDialog focus', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('moves focus into the dialog, traps Tab, and restores the opener', async () => {
    const opener = document.createElement('button')
    opener.textContent = 'Delete'
    document.body.append(opener)
    opener.focus()

    const wrapper = mount(ConfirmDialog, {
      props: dialogProps(false),
      attachTo: document.body,
    })

    await wrapper.setProps(dialogProps(true))
    await flushPromises()

    const panel = wrapper.get('[role="dialog"]').element
    const cancel = wrapper.get('button')
    const confirm = wrapper.findAll('button')[1]
    expect(confirm).toBeDefined()
    expect(document.activeElement).toBe(panel)
    expect(document.activeElement).not.toBe(confirm?.element)

    confirm?.element.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(document.activeElement).toBe(cancel.element)

    cancel.element.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(document.activeElement).toBe(confirm?.element)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()

    await wrapper.setProps(dialogProps(false))
    await flushPromises()
    expect(document.activeElement).toBe(opener)

    wrapper.unmount()
  })

  it('requires an explicit confirm click and ignores Escape while busy', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: dialogProps(true, true),
      attachTo: document.body,
    })
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('cancel')).toBeUndefined()

    await wrapper.setProps(dialogProps(true, false))
    await wrapper.findAll('button')[1]?.trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toBeUndefined()

    wrapper.unmount()
  })
})
